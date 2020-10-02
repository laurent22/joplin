import Plugin from '../Plugin';
import ToolbarButtonController, { ToolbarButtonLocation } from '../ToolbarButtonController';
import MenuItemController, { MenuItemLocation } from '../MenuItemController';
import KeymapService from 'lib/services/KeymapService';
import JoplinViewsDialogs from './JoplinViewsDialogs';
import JoplinViewsPanels from './JoplinViewsPanels';

interface CreateMenuItemOptions {
	accelerator: string,
}

export default class JoplinViews {

	private viewIdNum:number = 0;
	private store: any;
	private plugin: Plugin;

	private dialogs_:JoplinViewsDialogs = null;
	private panels_:JoplinViewsPanels = null;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	public get dialogs():JoplinViewsDialogs {
		if (!this.dialogs_) this.dialogs_ = new JoplinViewsDialogs(this.plugin, this.store);
		return this.dialogs_;
	}

	public get panels():JoplinViewsPanels {
		if (!this.panels_) this.panels_ = new JoplinViewsPanels(this.plugin, this.store);
		return this.panels_;
	}

	async createToolbarButton(commandName:string, location:ToolbarButtonLocation) {
		const idNum = this.viewIdNum++;
		const controller = new ToolbarButtonController(`plugin-view-${this.plugin.id}-${idNum}`, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
		return controller;
	}

	async createMenuItem(commandName:string, location:MenuItemLocation = MenuItemLocation.Tools, options:CreateMenuItemOptions = null) {
		const idNum = this.viewIdNum++;
		const controller = new MenuItemController(`plugin-view-${this.plugin.id}-${idNum}`, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);

		if (options && options.accelerator) {
			KeymapService.instance().registerCommandAccelerator(commandName, options.accelerator);
		}

		return controller;
	}

}
