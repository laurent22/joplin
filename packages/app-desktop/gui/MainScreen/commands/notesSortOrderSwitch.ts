import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

export const NOTES_SORT_ORDER_SWITCH = 'notesSortOrderSwitch';
export const SETTING_FIELD = 'notes.sortOrder.field';
export const SETTING_REVERSE = 'notes.sortOrder.reverse';
export const SETTING_PER_FIELD_REVERSAL_ENABLED = 'notes.perFieldReversalEnabled';
export const SETTING_PER_FIELD_REVERSE = 'notes.perFieldReverse';

let fields: string[] = null;
let perFieldReverse: { [field: string]: boolean } = null;

export const notesSortOrderFieldArray = (): string[] => {
	// The order of the fields is strictly determinate.
	if (fields == null) {
		fields = Setting.enumOptionValues(SETTING_FIELD).sort().reverse();
	}
	return fields;
};

export const notesSortOrderNextField = (currentField: string) => {
	const fields = notesSortOrderFieldArray();
	const index = fields.indexOf(currentField);
	if (index < 0) {
		return currentField;
	} else {
		return fields[(index + 1) % fields.length];
	}
};

export const declaration: CommandDeclaration = {
	name: NOTES_SORT_ORDER_SWITCH,
	label: () => _('Switch sort order'),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, field?: string | Array<any>, reverse?: boolean) => {
			// field: Sort order's field. undefined means switching a field.
			// reverse: whether the sort order is reversed or not. undefined means toggling.
			//
			// To support CommandService.scheduleExecute(), field accepts an size-two Array,
			// which means [field, reverse].
			let nextField: string;
			let nextReverse: boolean;
			if (typeof field !== 'object') {
				nextField = field;
				nextReverse = reverse;
			} else {
				nextField = field[0];
				nextReverse = field[1];
			}
			const currentField = Setting.value(SETTING_FIELD);
			const currentReverse = Setting.value(SETTING_REVERSE);
			const enabled = Setting.value(SETTING_PER_FIELD_REVERSAL_ENABLED);
			if (enabled) {
				if (perFieldReverse === null) {
					perFieldReverse = { ...Setting.value(SETTING_PER_FIELD_REVERSE) };
				}
			}
			if (typeof field === 'undefined') {
				if (typeof reverse === 'undefined') {
					// If both arguments are undefined, the next field is selected.
					nextField = notesSortOrderNextField(currentField);
				} else {
					nextField = currentField;
				}
			}
			if (typeof reverse === 'undefined') {
				if (enabled && perFieldReverse.hasOwnProperty(nextField)) {
					nextReverse = !!perFieldReverse[nextField];
				} else {
					nextReverse = currentReverse;
				}
			}
			if (currentField !== nextField) {
				Setting.setValue(SETTING_FIELD, nextField);
			}
			if (currentReverse !== nextReverse) {
				Setting.setValue(SETTING_REVERSE, nextReverse);
			}
			if (enabled) {
				// nextField is sane here.
				nextReverse = !!nextReverse;
				if (perFieldReverse[nextField] !== nextReverse) {
					perFieldReverse[nextField] = nextReverse;
					Setting.setValue(SETTING_PER_FIELD_REVERSE, { ...perFieldReverse });
				}
			}
		},
	};
};
