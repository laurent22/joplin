import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { setNotesSortOrder } from '../../../services/sortOrder/notesSortOrderUtils';

export const declaration: CommandDeclaration = {
	name: 'toggleNotesSortOrderReverse',
	label: () => _('Reverse sort order'),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			const reverse = Setting.value('notes.sortOrder.reverse');
			setNotesSortOrder(undefined, !reverse);
		},
	};
};
