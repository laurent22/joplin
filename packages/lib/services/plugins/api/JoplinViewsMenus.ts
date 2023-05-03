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

	public constructor(plugin: Plugin, store: any) {
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
	public async create(id: string, label: string, menuItems: MenuItem[], location: MenuItemLocation = MenuItemLocation.Tools) {
		if (!Array.isArray(menuItems)) {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.menus.create("my-unique-id", ...)`', true);
			location = menuItems as any || MenuItemLocation.Tools;
			menuItems = label as any;
			label = id as any;
			id = `${this.plugin.viewCount}`;
		}

		const handle = createViewHandle(this.plugin, id);
		const controller = new MenuController(handle, this.plugin.id, this.store, label, menuItems, location);
		this.plugin.addViewController(controller);
		this.registerCommandAccelerators(menuItems);
	}

}
