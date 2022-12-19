import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { profileIdByIndex } from '@joplin/lib/services/profileConfig';

export const declaration: CommandDeclaration = {
	name: 'switchProfile2',
	label: () => _('Switch to profile %d', 2),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			await CommandService.instance().execute('switchProfile', profileIdByIndex(context.state.profileConfig, 1));
		},
	};
};
