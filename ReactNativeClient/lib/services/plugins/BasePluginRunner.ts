import Plugin from './Plugin';
import BaseService from '../BaseService';
import Sandbox from './Sandbox/Sandbox';

interface EventHandlers {
	[key:string]: Function;
}

export default abstract class BasePluginRunner extends BaseService {

	private eventHandlerIndex_:number = 0;
	protected eventHandlers_:EventHandlers = {};

	protected mapEventHandlersToIds(arg:any) {
		if (Array.isArray(arg)) {
			for (let i = 0; i < arg.length; i++) {
				arg[i] = this.mapEventHandlersToIds(arg[i]);
			}
			return arg;
		} else if (typeof arg === 'function') {
			const id = `__event#${this.eventHandlerIndex_}`;
			this.eventHandlerIndex_++;
			this.eventHandlers_[id] = arg;
			return id;
		} else if (arg === null) {
			return null;
		} else if (arg === undefined) {
			return undefined;
		} else if (typeof arg === 'object') {
			for (const n in arg) {
				arg[n] = this.mapEventHandlersToIds(arg[n]);
			}
		}

		return arg;
	}

	async run(plugin:Plugin, sandbox:Sandbox) {
		throw new Error(`Not implemented: ${plugin} / ${sandbox}`);
	}

}
