import CommandService from '@joplin/lib/services/CommandService';
import stateToWhenClauseContext from '../services/commands/stateToWhenClauseContext';
import mainScreenCommands from '../gui/WindowCommandsAndDialogs/commands/index';
import noteEditorCommands from '../gui/NoteEditor/commands/index';
import noteListCommands from '../gui/NoteList/commands/index';
import noteListControlsCommands from '../gui/NoteListControls/commands/index';
import sidebarCommands from '../gui/Sidebar/commands/index';
import appCommands from '../commands/index';
import libCommands from '@joplin/lib/commands/index';
import editorCommandDeclarations from '../gui/NoteEditor/editorCommandDeclarations';

const commands = mainScreenCommands
	.concat(noteEditorCommands)
	.concat(noteListCommands)
	.concat(noteListControlsCommands)
	.concat(sidebarCommands);

// Commands that are not tied to any particular component.
// The runtime for these commands can be loaded when the app starts.
const globalCommands = appCommands.concat(libCommands);

export default function initializeCommandService(store: object, devMode: boolean) {
	CommandService.instance().initialize(store, devMode, stateToWhenClauseContext);

	for (const command of commands) {
		CommandService.instance().registerDeclaration(command.declaration);
	}

	for (const command of globalCommands) {
		CommandService.instance().registerDeclaration(command.declaration);
		CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
	}

	for (const declaration of editorCommandDeclarations) {
		CommandService.instance().registerDeclaration(declaration);
	}
}
