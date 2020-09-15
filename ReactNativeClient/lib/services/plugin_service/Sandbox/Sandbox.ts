import { SandboxContext } from '../utils/types';
import Plugin from '../Plugin';
import SandboxJoplin from './SandboxJoplin';

export default class Sandbox {

	private context: SandboxContext;
	private joplin_: SandboxJoplin;
	private consoleWrapper_:any = null;

	constructor(plugin: Plugin, store: any, context: SandboxContext) {
		this.context = context;
		this.joplin_ = new SandboxJoplin(plugin, store, this.context);
		this.consoleWrapper_ = this.createConsoleWrapper(plugin.id);
	}

	// Wraps console calls to allow prefixing them with "Plugin PLUGIN_ID:"
	private createConsoleWrapper(pluginId:string) {
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

	get joplin(): SandboxJoplin {
		return this.joplin_;
	}

	get console(): any {
		return this.consoleWrapper_;
	}

	setTimeout(fn: Function, interval: number) {
		return setTimeout(() => {
			fn();
		}, interval);
	}

	setInterval(fn: Function, interval: number) {
		return setInterval(() => {
			fn();
		}, interval);
	}

}
