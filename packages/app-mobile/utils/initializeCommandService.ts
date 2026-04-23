import Setting from '@joplin/lib/models/Setting';
import CommandService, { CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { AppState } from './types';
import { AnyAction, Store } from 'redux';
import editorCommandDeclarations from '../components/NoteEditor/commandDeclarations';
import noteCommands from '../components/screens/Note/commands';
import globalCommands from '../commands';
import libCommands from '@joplin/lib/commands';
import stateToWhenClauseContext from '../services/commands/stateToWhenClauseContext';

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

const initializeCommandService = (store: Store<AppState, AnyAction>) => {
	CommandService.instance().initialize(store, Setting.value('env') === 'dev', stateToWhenClauseContext);
	for (const declaration of editorCommandDeclarations) {
		CommandService.instance().registerDeclaration(declaration);
	}
	for (const command of noteCommands) {
		CommandService.instance().registerDeclaration(command.declaration);
	}
	registerCommands(globalCommands);
	registerCommands(libCommands);
};

export default initializeCommandService;
