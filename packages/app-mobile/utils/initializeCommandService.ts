import Setting from '@joplin/lib/models/Setting';
import CommandService, { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import stateToWhenClauseContext from '@joplin/lib/services/commands/stateToWhenClauseContext';
import { AppState } from './types';
import { Store } from 'redux';
import editorCommandDeclarations from '../components/NoteEditor/commandDeclarations';
import globalCommands from '../commands';
import libCommands from '@joplin/lib/commands';

interface CommandSpecification {
	declaration: CommandDeclaration;
	runtime: ()=> CommandRuntime;
}

const registerCommands = (commands: CommandSpecification[]) => {
	for (const command of commands) {
		CommandService.instance().registerDeclaration(command.declaration);
		CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const initializeCommandService = (store: Store<AppState, any>) => {
	CommandService.instance().initialize(store, Setting.value('env') === 'dev', stateToWhenClauseContext);
	for (const declaration of editorCommandDeclarations) {
		CommandService.instance().registerDeclaration(declaration);
	}
	registerCommands(globalCommands);
	registerCommands(libCommands);
};

export default initializeCommandService;
