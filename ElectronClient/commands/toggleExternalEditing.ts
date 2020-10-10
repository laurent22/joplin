import { CommandRuntime, CommandDeclaration } from '../lib/services/CommandService';
import { _ } from 'lib/locale';
import { AppState } from '../app';
import CommandService from 'lib/services/CommandService';

interface Props {
	noteId: string
	noteIsBeingWatched: boolean
}

export const declaration:CommandDeclaration = {
	name: 'toggleExternalEditing',
	label: () => _('Toggle external editing'),
	iconName: 'icon-share',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (props:Props) => {
			if (!props.noteId) return;

			if (props.noteIsBeingWatched) {
				CommandService.instance().execute('stopExternalEditing', { noteId: props.noteId });
			} else {
				CommandService.instance().execute('startExternalEditing', { noteId: props.noteId });
			}
		},
		isEnabled: (props:Props) => {
			return !!props.noteId;
		},
		mapStateToProps: (state:AppState):Props => {
			const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;
			return {
				noteId: noteId,
				noteIsBeingWatched: noteId ? state.watchedNoteFiles.includes(noteId) : false,
			};
		},
		title: (props:Props) => {
			return props.noteIsBeingWatched ? _('Stop') : '';
		},
	};
};
