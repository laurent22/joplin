import * as vm from 'vm';
import Plugin from 'lib/services/plugin_service/Plugin';
import sandboxProxy from 'lib/services/plugin_service/sandboxProxy';
import BasePluginRunner from 'lib/services/plugin_service/BasePluginRunner';
import executeSandboxCall from 'lib/services/plugin_service/utils/executeSandboxCall';
import Sandbox from 'lib/services/plugin_service/Sandbox/Sandbox';

function createConsoleWrapper(pluginId:string) {
	const wrapper:any = {};

	for (const n in console) {
		if (!console.hasOwnProperty(n)) continue;
		wrapper[n] = (...args:any[]) => {
			const newArgs = args.slice();
			newArgs.splice(0, 0, `Plugin "${pluginId}":`);
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

export default class PluginRunner extends BasePluginRunner {

	constructor() {
		super();

		this.eventHandler = this.eventHandler.bind(this);
	}

	private async eventHandler(eventHandlerId:string, args:any[]) {
		const cb = this.eventHandlers_[eventHandlerId];
		delete this.eventHandlers_[eventHandlerId];
		return cb(...args);
	}

	private newSandboxProxy(pluginId:string, sandbox:Sandbox) {

		// Note: for desktop, the implementation should be like so:
		// In the target, we post an IPC message with the path, args, etc. as well as a callbackId to the host
		// The target saves this callbackId and associate it with a Promise that it returns.
		// When the host responds back (via IPC), we get the promise back using the callbackId, then call resolve
		// with what was sent from the host.

		const target = async (path:string, args:any[]) => {
			return executeSandboxCall(pluginId, sandbox, `joplin.${path}`, this.mapEventHandlersToIds(args), this.eventHandler);
		};

		return {
			joplin: sandboxProxy(target),
			console: createConsoleWrapper(pluginId),
		};
	}

	async run(plugin:Plugin, sandbox:Sandbox) {
		const vmSandbox = vm.createContext(this.newSandboxProxy(plugin.id, sandbox));

		try {
			vm.runInContext(plugin.scriptText, vmSandbox);
		} catch (error) {
			this.logger().error(`In plugin ${plugin.id}:`, error);
			return;
		}
	}

}
