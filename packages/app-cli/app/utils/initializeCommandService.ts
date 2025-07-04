import CommandService from '@joplin/lib/services/CommandService';
import stateToWhenClauseContext from '@joplin/lib/services/commands/stateToWhenClauseContext';
import libCommands from '@joplin/lib/commands/index';
import { State } from '@joplin/lib/reducer';
import { Store } from 'redux';

export default function initializeCommandService(store: Store<State>, devMode: boolean) {
	CommandService.instance().initialize(store, devMode, stateToWhenClauseContext);

	for (const command of libCommands) {
		CommandService.instance().registerDeclaration(command.declaration);
		CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
	}
}
