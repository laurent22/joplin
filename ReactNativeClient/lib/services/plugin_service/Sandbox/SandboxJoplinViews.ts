import WebviewController from '../WebviewController';
import Plugin from '../Plugin';
import ToolbarButtonController, { ToolbarButtonLocation } from '../ToolbarButtonController';
import MenuItemController, { MenuItemLocation } from '../MenuItemController';

export default class SandboxJoplinViews {

	private viewIdNum:number = 0;
	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	createWebviewPanel() {
		const idNum = this.viewIdNum++;
		const controller = new WebviewController(`plugin-view-${this.plugin.id}-${idNum}`, this.plugin.id, this.store, this.plugin.baseDir);
		this.plugin.addViewController(controller);
		return controller;
	}

	createToolbarButton(commandName:string, location:ToolbarButtonLocation) {
		const idNum = this.viewIdNum++;
		const controller = new ToolbarButtonController(`plugin-view-${this.plugin.id}-${idNum}`, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
		return controller;
	}

	createMenuItem(commandName:string, location:MenuItemLocation) {
		const idNum = this.viewIdNum++;
		const controller = new MenuItemController(`plugin-view-${this.plugin.id}-${idNum}`, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
		return controller;
	}

}
