import { CommandRuntime, CommandDeclaration } from 'lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteList',
	label: () => _('Note list'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteId }:any) => {
			if (noteId) {
				const ref = comp.itemAnchorRef(noteId);
				if (ref) ref.focus();
			}
		},
		isEnabled: (props:any):boolean => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any):any => {
			return {
				noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
			};
		},
	};
};
