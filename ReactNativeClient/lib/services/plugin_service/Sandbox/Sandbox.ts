import { SandboxContext } from '../utils/types';
import Plugin from '../Plugin';
import SandboxJoplin from './SandboxJoplin';

export default class Sandbox {

	private context: SandboxContext;
	private joplin_: SandboxJoplin;

	constructor(plugin: Plugin, store: any, context: SandboxContext) {
		this.context = context;
		this.joplin_ = new SandboxJoplin(plugin, store, this.context);
	}

	get joplin(): SandboxJoplin {
		return this.joplin_;
	}

	get console(): any {
		return console;
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
