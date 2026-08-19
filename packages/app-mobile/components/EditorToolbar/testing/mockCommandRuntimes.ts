import { Store } from 'redux';
import { AppState } from '../../../utils/types';
import CommandService, { CommandRuntime } from '@joplin/lib/services/CommandService';
import allToolbarCommandNamesFromState from '../utils/allToolbarCommandNamesFromState';

// The toolbar expects all toolbar command runtimes to be registered before it can be
// rendered:
const mockCommandRuntimes = (store: Store<AppState>) => {
	const makeMockRuntime = (commandName: string) => ({
		declaration: { name: commandName },
		runtime: (_props: null): CommandRuntime => ({
			execute: jest.fn(),
		}),
	});

	const isSeparator = (commandName: string) => commandName === '-';

	const mockRuntimes = allToolbarCommandNamesFromState(
		store.getState(),
	).filter(
		name => !isSeparator(name),
	).map(makeMockRuntime);
	return CommandService.instance().componentRegisterCommands(
		null, mockRuntimes,
	);
};

export default mockCommandRuntimes;
