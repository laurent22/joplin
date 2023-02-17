import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import dialogs from '../../dialogs';

export const declaration: CommandDeclaration = {
	name: 'resetLayout',
	label: () => _('Reset application layout'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {

			const message = _('Are you sure you want to return to the default layout? The current layout configuration will be lost.');
			const isConfirmed = await dialogs.confirm(message);

			if (!isConfirmed) return;

			context.dispatch({
				type: 'RESET_LAYOUT',
				value: true,
			});
		},
	};
};
