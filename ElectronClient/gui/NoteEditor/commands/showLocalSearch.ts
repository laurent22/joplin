import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'showLocalSearch',
	label: () => _('Search in current note'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async () => {
			if (comp.editorRef.current && comp.editorRef.current.supportsCommand('search')) {
				comp.editorRef.current.execCommand({ name: 'search' });
			} else {
				comp.setShowLocalSearch(true);
				if (comp.noteSearchBarRef.current) comp.noteSearchBarRef.current.wrappedInstance.focus();
			}
		},
		isEnabled: (props:any) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:any) => {
			return { noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null };
		},
	};
};
