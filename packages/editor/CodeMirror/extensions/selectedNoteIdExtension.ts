import { Facet, StateEffect, StateField } from '@codemirror/state';

// Allows updating the note ID stored in the state. Accessing the
// note ID associated with the editor can be useful for plugins.
export const setNoteIdEffect = StateEffect.define<string>();

// Allows accessing the note ID
export const noteIdFacet = Facet.define<string, string>({
	combine: (possibleValues) => {
		return possibleValues[0] ?? '';
	},
});

const noteIdField = StateField.define({
	create: () => '',
	update: (oldValue, transaction) => {
		for (const e of transaction.effects) {
			if (e.is(setNoteIdEffect)) {
				return e.value;
			}
		}
		return oldValue;
	},
	provide: (field) => noteIdFacet.from(field),
});

export default [noteIdField];
