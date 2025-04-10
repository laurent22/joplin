import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'openPrimaryAppInstance',
	label: () => _('Open primary app instance...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await bridge().launchMainAppInstance(Setting.value('env'));
		},

		enabledCondition: 'isAltInstance',
	};
};
