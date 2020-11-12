import KeymapService from '../../KeymapService';
import { MenuItem, MenuItemLocation } from './types';
import MenuController from '../MenuController';
import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';

/**
 * Allows creating menus.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/menu)
 */
export default class JoplinViewsMenus {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	private registerCommandAccelerators(menuItems: MenuItem[]) {
		for (const menuItem of menuItems) {
			if (menuItem.accelerator) {
				KeymapService.instance().registerCommandAccelerator(menuItem.commandName, menuItem.accelerator);
			}

			if (menuItem.submenu) {
				this.registerCommandAccelerators(menuItem.submenu);
			}
		}
	}

	/**
	 * Creates a new menu from the provided menu items and place it at the given location. As of now, it is only possible to place the
	 * menu as a sub-menu of the application build-in menus.
	 */
	public async create(label: string, menuItems: MenuItem[], location: MenuItemLocation = MenuItemLocation.Tools) {
		const handle = createViewHandle(this.plugin);
		const controller = new MenuController(handle, this.plugin.id, this.store, label, menuItems, location);
		this.plugin.addViewController(controller);
		this.registerCommandAccelerators(menuItems);
	}

}
