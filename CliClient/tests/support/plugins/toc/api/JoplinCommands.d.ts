import { Command } from './types';
/**
 * This class allows executing or registering new Joplin commands. Commands can be executed or associated with
 * {@link JoplinViewsToolbarButtons | toolbar buttons} or {@link JoplinViewsMenuItems | menu items}.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/CliClient/tests/support/plugins/register_command)
 */
export default class JoplinCommands {
    /**
     * <span class="platform-desktop">desktop</span> Executes the given command.
     * The `props` are the arguments passed to the command, and they vary based on the command
     *
     * ```typescript
     * // Create a new note in the current notebook:
     * await joplin.commands.execute('newNote');
     *
     * // Create a new sub-notebook under the provided notebook
     * // Note: internally, notebooks are called "folders".
     * await joplin.commands.execute('newFolder', { parent_id: "SOME_FOLDER_ID" });
     * ```
     */
    execute(commandName: string, props?: any): Promise<void>;
    /**
     * <span class="platform-desktop">desktop</span> Registers a new command.
     *
     * ```typescript
     * // Register a new commmand called "testCommand1"
     *
     * await joplin.commands.register({
     *     name: 'testCommand1',
     *     label: 'My Test Command 1',
     *     iconName: 'fas fa-music',
     *     execute: () => {
     *         alert('Testing plugin command 1');
     *     },
     * });
     * ```
     */
    register(command: Command): Promise<void>;
}
