import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'openSecondaryAppInstance',
	label: () => _('Open secondary app instance...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await bridge().launchAltAppInstance(Setting.value('env'));
		},

		enabledCondition: '!isAltInstance',
	};
};
