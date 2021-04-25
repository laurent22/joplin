import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'toggleSafeMode',
	label: () => _('Toggle safe mode'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, enabled: boolean = null) => {
			enabled = enabled !== null ? enabled : !Setting.value('isSafeMode');
			Setting.setValue('isSafeMode', enabled);
			await Setting.saveAll();
			bridge().restart();
		},
	};
};
