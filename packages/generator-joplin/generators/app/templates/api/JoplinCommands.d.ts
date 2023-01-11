import { Command } from './types';
/**
 * This class allows executing or registering new Joplin commands. Commands
 * can be executed or associated with
 * {@link JoplinViewsToolbarButtons | toolbar buttons} or
 * {@link JoplinViewsMenuItems | menu items}.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 *
 * ## Executing Joplin's internal commands
 *
 * It is also possible to execute internal Joplin's commands which, as of
 * now, are not well documented. You can find the list directly on GitHub
 * though at the following locations:
 *
 * * [Main screen commands](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/gui/MainScreen/commands)
 * * [Global commands](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/commands)
 * * [Editor commands](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/gui/NoteEditor/editorCommandDeclarations.ts)
 *
 * To view what arguments are supported, you can open any of these files
 * and look at the `execute()` command.
 *
 * ## Executing editor commands
 *
 * There might be a situation where you want to invoke editor commands
 * without using a {@link JoplinContentScripts | contentScript}. For this
 * reason Joplin provides the built in `editor.execCommand` command.
 *
 * `editor.execCommand`  should work with any core command in both the
 * [CodeMirror](https://codemirror.net/doc/manual.html#execCommand) and
 * [TinyMCE](https://www.tiny.cloud/docs/api/tinymce/tinymce.editorcommands/#execcommand) editors,
 * as well as most functions calls directly on a CodeMirror editor object (extensions).
 *
 * * [CodeMirror commands](https://codemirror.net/doc/manual.html#commands)
 * * [TinyMCE core editor commands](https://www.tiny.cloud/docs/advanced/editor-command-identifiers/#coreeditorcommands)
 *
 * `editor.execCommand` supports adding arguments for the commands.
 *
 * ```typescript
 * await joplin.commands.execute('editor.execCommand', {
 *     name: 'madeUpCommand', // CodeMirror and TinyMCE
 *     args: [], // CodeMirror and TinyMCE
 *     ui: false, // TinyMCE only
 *     value: '', // TinyMCE only
 * });
 * ```
 *
 * [View the example using the CodeMirror editor](https://github.com/laurent22/joplin/blob/dev/packages/app-cli/tests/support/plugins/codemirror_content_script/src/index.ts)
 *
 */
export default class JoplinCommands {
    /**
     * <span class="platform-desktop">desktop</span> Executes the given
     * command.
     *
     * The command can take any number of arguments, and the supported
     * arguments will vary based on the command. For custom commands, this
     * is the `args` passed to the `execute()` function. For built-in
     * commands, you can find the supported arguments by checking the links
     * above.
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
