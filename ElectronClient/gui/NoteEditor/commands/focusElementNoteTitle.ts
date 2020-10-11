import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
import { _ } from 'lib/locale';

export const declaration:CommandDeclaration = {
	name: 'focusElementNoteTitle',
	label: () => _('Note title'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (!comp.titleInputRef.current) return;
			comp.titleInputRef.current.focus();
		},
		isEnabled: (props:any):boolean => {
			return props.hasOneNoteSelected;
		},
		mapStateToProps: (state:any):any => {
			return {
				hasOneNoteSelected: state.selectedNoteIds.length === 1,
			};
		},

	};
};
