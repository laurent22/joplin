import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame from '../NewWindowOrIFrame';
import WindowCommandHandler from '../WindowCommandHandler/WindowCommandHandler';

import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
const { StyleSheetManager } = require('styled-components');

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

	const windowContent = <NewWindowOrIFrame newWindow={props.newWindow} onClose={onClose}>
		<LibraryStyleRoot>
			<WindowCommandHandler />
			{editor}
		</LibraryStyleRoot>
		<StyleSheetContainer />
	</NewWindowOrIFrame>;
	return props.newWindow ? windowContent : editor;
};

interface StyleProviderProps {
	children: React.ReactNode[]|React.ReactNode;
}

// Sets the root style container for libraries. At present, this is needed by react-select (which uses @emotion/...)
// and styled-components.
// See: https://github.com/JedWatson/react-select/issues/3680 and https://github.com/styled-components/styled-components/issues/659
const LibraryStyleRoot: React.FC<StyleProviderProps> = props => {
	const [dependencyStyleContainer, setDependencyStyleContainer] = useState<HTMLDivElement|null>(null);
	const cache = useMemo(() => {
		return createCache({
			key: 'new-window-cache',
			container: dependencyStyleContainer,
		});
	}, [dependencyStyleContainer]);

	return <>
		<div ref={setDependencyStyleContainer}></div>
		<StyleSheetManager target={dependencyStyleContainer}>
			<CacheProvider value={cache}>
				{props.children}
			</CacheProvider>
		</StyleSheetManager>
	</>;
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
