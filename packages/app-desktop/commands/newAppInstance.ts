import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'newAppInstance',
	label: () => _('New application instance...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await bridge().launchNewAppInstance(Setting.value('env'));
		},

		enabledCondition: '!isAltInstance',
	};
};
