import KeymapService from '../../KeymapService';
import { CreateMenuItemOptions, MenuItemLocation } from './types';
import MenuItemController from '../MenuItemController';
import Plugin from '../Plugin';
import createViewHandle from '../utils/createViewHandle';

/**
 * Allows creating and managing menu items.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 */
export default class JoplinViewsMenuItems {

	private store: any;
	private plugin: Plugin;

	public constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	/**
	 * Creates a new menu item and associate it with the given command. You can specify under which menu the item should appear using the `location` parameter.
	 */
	public async create(id: string, commandName: string, location: MenuItemLocation = MenuItemLocation.Tools, options: CreateMenuItemOptions = null) {
		if (typeof location !== 'string') {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.menuItem.create("my-unique-id", ...)`', true);
			options = location as any;
			location = commandName as any || MenuItemLocation.Tools;
			commandName = id as any;
			id = `${this.plugin.viewCount}`;
		}

		const handle = createViewHandle(this.plugin, id);
		const controller = new MenuItemController(handle, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);

		// Register the command with the keymap service - not that if no
		// accelerator is provided, we still register the command, so that
		// it appears in the keymap editor, which will allow the user to
		// set a custom shortcut.
		//
		// https://discourse.joplinapp.org/t/plugin-note-tabs/12752/39

		if (options && options.accelerator) {
			KeymapService.instance().registerCommandAccelerator(commandName, options.accelerator);
		} else {
			KeymapService.instance().registerCommandAccelerator(commandName, null);
		}
	}

}
