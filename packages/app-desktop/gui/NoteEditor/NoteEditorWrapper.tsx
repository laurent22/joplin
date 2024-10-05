import * as React from 'react';
import { useCallback } from 'react';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame from '../NewWindowOrIFrame';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	bodyEditor: string;
	newWindow: boolean;
	noteId?: string;
	defaultNoteId: string;
	provisionalNoteIds: string[];
}

const NoteEditorWrapper: React.FC<Props> = props => {
	const onClose = useCallback(() => {
		props.dispatch({ type: 'NOTE_WINDOW_CLOSE', noteId: props.noteId });
	}, [props.dispatch, props.noteId]);

	const noteId = props.noteId ?? props.defaultNoteId;
	const editor = <NoteEditor bodyEditor={props.bodyEditor} noteId={noteId} isProvisional={props.provisionalNoteIds.includes(noteId)}/>;

	// TODO: Always render the editor in an <iframe> or window. Doing so would allow more easily catching bugs specific
	// to running the editor in a separate window but would also break custom CSS and tests.
	return props.newWindow ? <NewWindowOrIFrame newWindow={true} onClose={onClose}>
		{editor}
		<StyleSheetContainer />
	</NewWindowOrIFrame> : editor;
};

export default connect((state: AppState) => {
	let bodyEditor = state.settings['editor.codeView'] ? 'CodeMirror6' : 'TinyMCE';

	if (state.settings.isSafeMode) {
		bodyEditor = 'PlainText';
	} else if (state.settings['editor.codeView'] && state.settings['editor.legacyMarkdown']) {
		bodyEditor = 'CodeMirror5';
	}

	const defaultNoteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;

	return {
		themeId: state.settings.theme,
		provisionalNoteIds: state.provisionalNoteIds,
		defaultNoteId: defaultNoteId,
		bodyEditor,
	};
})(NoteEditorWrapper);
