import WebviewController from '../WebviewController';
import Plugin from '../Plugin';

export default class SandboxJoplinViews {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	createWebviewPanel() {
		const controller = new WebviewController(this.plugin.id, this.store, this.plugin.baseDir);
		this.plugin.addViewController(controller);
		return controller;
	}

}
