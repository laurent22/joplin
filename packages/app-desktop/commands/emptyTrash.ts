import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import emptyTrash from '@joplin/lib/services/trash/emptyTrash';
import bridge from '../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'emptyTrash',
	label: () => _('Empty trash'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			const ok = await bridge().showConfirmMessageBox(_('This will permanently delete all items in the trash. Continue?'), {
				buttons: [
					_('Empty trash'),
					_('Cancel'),
				],
			});

			if (ok) await emptyTrash();
		},
	};
};
