import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import dialogs from '../../dialogs';
// import Setting from '@joplin/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'restoreDefaultLayout',
	label: () => _('Restore default layout'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			const message = _('Are you sure you want to return to the default layout? The current layout configuration will be lost.');
			const confirmed = await dialogs.confirm(message);

			if (!confirmed) return;

			// load the default values
			// set as the new active ones
			// log a event??
		},
	};
};
