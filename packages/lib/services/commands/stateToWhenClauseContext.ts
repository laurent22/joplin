import { State, stateUtils } from '../../reducer';

const BaseModel = require('../../BaseModel').default;
const Folder = require('../../models/Folder');
const MarkupToHtml = require('@joplin/renderer/MarkupToHtml').default;

export default function stateToWhenClauseContext(state: State) {
	const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;
	const note = noteId ? BaseModel.byId(state.notes, noteId) : null;

	return {
		// Application state
		notesAreBeingSaved: stateUtils.hasNotesBeingSaved(state),
		syncStarted: state.syncStarted,

		// Current location
		inConflictFolder: state.selectedFolderId === Folder.conflictFolderId(),

		// Note selection
		oneNoteSelected: !!note,
		someNotesSelected: state.selectedNoteIds.length > 0,
		multipleNotesSelected: state.selectedNoteIds.length > 1,
		noNotesSelected: !state.selectedNoteIds.length,

		// Note history
		historyhasBackwardNotes: state.backwardHistoryNotes.length > 0,
		historyhasForwardNotes: state.forwardHistoryNotes.length > 0,

		// Folder selection
		oneFolderSelected: !!state.selectedFolderId,

		// Current note properties
		noteIsTodo: note ? !!note.is_todo : false,
		noteTodoCompleted: note ? !!note.todo_completed : false,
		noteIsMarkdown: note ? note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN : false,
		noteIsHtml: note ? note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML : false,
	};
}
