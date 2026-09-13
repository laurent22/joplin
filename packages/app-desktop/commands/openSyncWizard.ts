import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'openSyncWizard',
	label: () => _('Open sync wizard'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'syncWizard',
			});
		},
	};
};
