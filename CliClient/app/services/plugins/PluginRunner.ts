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
