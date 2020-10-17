const BaseModel = require('lib/BaseModel');
const MarkupToHtml = require('lib/joplin-renderer/MarkupToHtml');

export default function stateToBooleanExpressionContext(state:any) {
	const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;
	const note = noteId ? BaseModel.byId(state.notes, noteId) : null;

	return {
		markdownEditorVisible: state.settings['editor.codeView'] && state.noteVisiblePanes.includes('editor'),
		isDialogVisible: !!Object.keys(state.visibleDialogs).length,
		isMarkdownNote: note ? note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN : false,
		hasOneSelectedNote: !!note,
		selectedNoteCount: state.selectedNoteIds.length,
	};
}
