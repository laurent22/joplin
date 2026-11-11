import { ToolbarButtonLocation } from './types';
import Plugin from '../Plugin';
import { PluginStore } from '../ViewController';
/**
 * Allows creating and managing toolbar buttons.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 */
export default class JoplinViewsToolbarButtons {
    private store;
    private plugin;
    constructor(plugin: Plugin, store: PluginStore);
    /**
     * Creates a new toolbar button and associate it with the given command.
     */
    create(id: string, commandName: string, location: ToolbarButtonLocation): Promise<void>;
}
