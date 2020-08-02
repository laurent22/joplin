import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteList',
	label: () => _('Note list'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ selectedNoteIds }:any) => {
			if (selectedNoteIds.length) {
				const ref = comp.itemAnchorRef(selectedNoteIds[0]);
				if (ref) ref.focus();
			}
		},
		isEnabled: (props:any):boolean => {
			return !!props.selectedNoteIds.length;
		},
		mapStateToProps: (state:any):any => {
			return {
				selectedNoteIds: state.selectedNoteIds,
			};
		},
	};
};
