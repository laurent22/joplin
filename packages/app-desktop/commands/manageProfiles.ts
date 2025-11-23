import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'manageProfiles',
	label: () => _('Manage profiles'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			context.dispatch({
				type: 'NAV_GO',
				routeName: 'ProfileManagement',
			});
		},
		enabledCondition: 'hasMultiProfiles',
	};
};

