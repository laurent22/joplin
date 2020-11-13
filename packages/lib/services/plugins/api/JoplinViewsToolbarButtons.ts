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
	async create(commandName: string, location: ToolbarButtonLocation) {
		const handle = createViewHandle(this.plugin);
		const controller = new ToolbarButtonController(handle, this.plugin.id, this.store, commandName, location);
		this.plugin.addViewController(controller);
	}

}
