import { ToolbarButtonLocation } from './types';
import Plugin from '../Plugin';
import ToolbarButtonController from '../ToolbarButtonController';
import createViewHandle from '../utils/createViewHandle';

/**
 * Allows creating and managing toolbar buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 */
export default class JoplinViewsToolbarButtons {

	private store: any;
	private plugin: Plugin;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	/**
	 * Creates a new toolbar button and associate it with the given command.
	 */
	async create(id: string, commandName: string, location: ToolbarButtonLocation) {
		if (arguments.length < 3) {
			this.plugin.deprecationNotice('1.5', 'Creating a view without an ID is deprecated. To fix it, change your call to `joplin.views.toolbarButtons.create("my-unique-id", ...)`', true);
			location = commandName as any;
			commandName = id as any;
			id = `${this.plugin.viewCount}`;
		}

		const handle = createViewHandle(this.plugin, id);
		const controller = new ToolbarButtonController(handle, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
	}

}
