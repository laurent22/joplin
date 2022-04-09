import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'switchProfile0',
	label: () => _('Switch to profile %d', 0),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await CommandService.instance().execute('switchProfile', 0);
		},
	};
};
