# Editor Commands

## On Mobile

On mobile, there are two types of editor-related commands:
- Editor commands
- Note screen commands

These commands can be used in different cases and run in different contexts.

### Note screen commands

These commands are stored in `packages/app-mobile/components/screens/Note/commands`. Note screen commands run in the main React Native JavaScript context.

After adding a new note screen command, run `yarn buildScriptIndexes` from the top-level Joplin directory.

### CodeMirror commands

These commands are stored in `packages/editor/CodeMirror/editorCommands/editorCommands.ts` and are shared between mobile and desktop. On mobile, these commands run in the editor `WebView`, giving them access to the CodeMirror API.

Although all of these commands can be accessed by plugins using `editor.execCommand`, some are registered directly with the `CommandService`. Registering an editor command with the `CommandService` can be useful in a few circumstances. In particular, it:
- Allows the command to be run directly using `CommandService.instance().execute('commandName')`. This makes it simpler for plugins to access the command.
- Allows adding a toolbar button for the command.

New editor commands registered with `CommandService` should:
- Be added to `NoteEditor/commandDeclarations.ts` in the `app-mobile` package.
- Be given the `editor.` prefix to mark them as editor commands. This changes how the commands are applied, for example, by focusing the editor after the command completes.

While testing a new editor command, be sure to watch the bundled editor JavaScript for changes. See `BUILD.md` for details.

## On Desktop

On desktop, the different note editor types each register their own command handlers. For example, the `useEditorCommands.ts` hook in `NoteBody/CodeMirror/v6/useEditorCommands.ts` is responsible for registering the different editor commands.

In most cases, to share code with the mobile app, new commands here should call:
```js
    // For some SomeCommand implemented in packages/editor
    editorRef.current.execCommand(EditorCommandType.SomeCommand, ...argsHere)
```
