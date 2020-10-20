import { Command } from './types';
/**
 * This class allows executing or registering new Joplin commands. Commands can be executed or associated with
 * {@link JoplinViewsToolbarButtons | toolbar buttons} or {@link JoplinViewsMenuItems | menu items}.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/CliClient/tests/support/plugins/register_command)
 *
 * ## Executing Joplin's internal commands
 *
 * It is also possible to execute internal Joplin's commands which, as of now, are not well documented.
 * You can find the list directly on GitHub though at the following locations:
 *
 * https://github.com/laurent22/joplin/tree/dev/ElectronClient/gui/MainScreen/commands
 * https://github.com/laurent22/joplin/tree/dev/ElectronClient/commands
 * https://github.com/laurent22/joplin/tree/dev/ElectronClient/gui/NoteEditor/commands/editorCommandDeclarations.ts
 *
 * To view what arguments are supported, you can open any of these files and look at the `execute()` command.
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
     * await joplin.commands.execute('newFolder', "SOME_FOLDER_ID");
     * ```
     */
    execute(commandName: string, ...args: any[]): Promise<any | void>;
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
