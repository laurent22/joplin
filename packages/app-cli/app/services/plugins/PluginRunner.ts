import * as vm from 'vm';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import executeSandboxCall from '@joplin/lib/services/plugins/utils/executeSandboxCall';
import Global from '@joplin/lib/services/plugins/api/Global';
import mapEventHandlersToIds, { EventHandlers } from '@joplin/lib/services/plugins/utils/mapEventHandlersToIds';
import uuid from '@joplin/lib/uuid';
import Joplin from '@joplin/lib/services/plugins/api/Joplin';
import { Console } from 'console';
const sandboxProxy = require('@joplin/lib/services/plugins/sandboxProxy');

function createConsoleWrapper(pluginId: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const wrapper: any = {};

	for (const n in console) {
		// eslint-disable-next-line no-console
		if (!console.hasOwnProperty(n)) continue;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		wrapper[n] = (...args: any[]) => {
			const newArgs = args.slice();
			newArgs.splice(0, 0, `Plugin "${pluginId}":`);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			return (console as any)[n](...newArgs);
		};
	}

	return wrapper;
}

// The CLI plugin runner is more complex than it needs to be because it more or less emulates
// how it would work in a multi-process architecture, as in the desktop app (and probably how
// it would work in the mobile app too). This is mainly to allow doing integration testing.
//
// For example, all plugin calls go through a proxy, however they could made directly since
// the plugin script is running within the same process as the main app.

interface SandboxProxy {
	joplin: Joplin;
	console: typeof Console;
	stop: ()=> void;
}

export default class PluginRunner extends BasePluginRunner {

	private eventHandlers_: EventHandlers = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private activeSandboxCalls_: any = {};
	private sandboxProxies: Map<string, SandboxProxy> = new Map();

	public constructor() {
		super();

		this.eventHandler = this.eventHandler.bind(this);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async eventHandler(eventHandlerId: string, args: any[]) {
		const cb = this.eventHandlers_[eventHandlerId];
		return cb(...args);
	}

	private newSandboxProxy(pluginId: string, sandbox: Global) {
		let stopped = false;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const target = async (path: string, args: any[]) => {
			if (stopped) {
				throw new Error(`Plugin with ID ${pluginId} has been stopped. Cannot execute sandbox call.`);
			}

			const callId = `${pluginId}::${path}::${uuid.createNano()}`;
			this.activeSandboxCalls_[callId] = true;
			const promise = executeSandboxCall(pluginId, sandbox, `joplin.${path}`, mapEventHandlersToIds(args, this.eventHandlers_), this.eventHandler);
			// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			void promise.finally(() => {
				delete this.activeSandboxCalls_[callId];
			});
			return promise;
		};

		const proxy = {
			joplin: sandboxProxy(target),
			console: createConsoleWrapper(pluginId),
			stop: () => {
				stopped = true;
			},
		};
		this.sandboxProxies.set(pluginId, proxy);
		return proxy;
	}

	public async run(plugin: Plugin, sandbox: Global): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function, reject: Function) => {
			const onStarted = () => {
				plugin.off('started', onStarted);
				resolve();
			};

			plugin.on('started', onStarted);

			const vmSandbox = vm.createContext(this.newSandboxProxy(plugin.id, sandbox));

			try {
				vm.runInContext(plugin.scriptText, vmSandbox);
			} catch (error) {
				reject(error);
			}
		});
	}

	public async stop(plugin: Plugin): Promise<void> {
		// TODO: Node VM doesn't support stopping plugins without running them in a child process.
		// For now, we stop the plugin by making interactions with the Joplin API throw Errors.
		const proxy = this.sandboxProxies.get(plugin.id);
		proxy?.stop();
	}

	public async waitForSandboxCalls(): Promise<void> {
		const startTime = Date.now();
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		return new Promise((resolve: Function, reject: Function) => {
			const iid = setInterval(() => {
				if (!Object.keys(this.activeSandboxCalls_).length) {
					clearInterval(iid);
					resolve();
				}

				if (Date.now() - startTime > 4000) {
					clearInterval(iid);
					reject(new Error(`Timeout while waiting for sandbox calls to complete: ${JSON.stringify(this.activeSandboxCalls_)}`));
				}
			}, 10);
		});
	}

}
