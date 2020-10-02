import Plugin from '../Plugin';
import createViewHandle, { ViewHandle } from '../utils/createViewHandle';
import WebviewController from '../WebviewController';

export default class JoplinViewsPanels {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private controller(handle:ViewHandle):WebviewController {
		return this.plugin.viewController(handle) as WebviewController;
	}

	async create() {
		const handle = createViewHandle(this.plugin);
		const controller = new WebviewController(handle, this.plugin.id, this.store, this.plugin.baseDir);
		this.plugin.addViewController(controller);
		return handle;
	}

	async setHtml(handle:ViewHandle, html:string) {
		return this.controller(handle).html = html;
	}

	async addScript(handle:ViewHandle, scriptPath:string) {
		return this.controller(handle).addScript(scriptPath);
	}

	async onMessage(handle:ViewHandle, callback:Function) {
		return this.controller(handle).onMessage(callback);
	}

}
