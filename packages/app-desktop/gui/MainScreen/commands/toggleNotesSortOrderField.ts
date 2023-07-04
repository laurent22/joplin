import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import { setNotesSortOrder } from '../../../services/sortOrder/notesSortOrderUtils';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'toggleNotesSortOrderField',
	label: () => _('Toggle sort order field'),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, field?: string | any[], reverse?: boolean) => {
			// field: Sort order's field. undefined means switching a field.
			// reverse: whether the sort order is reversed or not. undefined means toggling.
			//
			// To support CommandService.scheduleExecute(), field accepts an size-two Array,
			// which means [field, reverse].
			if (typeof field !== 'object') {
				setNotesSortOrder(field, reverse);
			} else {
				setNotesSortOrder(field[0], field[1]);
			}
		},
	};
};
