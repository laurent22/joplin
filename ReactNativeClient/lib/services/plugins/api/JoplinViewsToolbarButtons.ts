import Plugin from '../Plugin';
import ToolbarButtonController, { ToolbarButtonLocation } from '../ToolbarButtonController';
import createViewHandle from '../utils/createViewHandle';

export default class JoplinViewsToolbarButtons {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	async create(commandName:string, location:ToolbarButtonLocation) {
		const handle = createViewHandle(this.plugin);
		const controller = new ToolbarButtonController(handle, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
		return controller;
	}

}
