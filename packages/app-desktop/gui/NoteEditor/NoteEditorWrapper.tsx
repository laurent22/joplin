import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame from '../NewWindowOrIFrame';
import WindowCommandHandler from '../WindowCommandHandler/WindowCommandHandler';

const { StyleSheetManager } = require('styled-components');
// Note: Transitive dependencies used only by react-select. Remove if react-select is removed.
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { stateUtils } from '@joplin/lib/reducer';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	bodyEditor: string;
	newWindow: boolean;
	windowId: string;
	activeWindowId: string;

	secondaryWindowNoteIds: Record<string, string[]>;
	provisionalNoteIds: string[];
}

const NoteEditorWrapper: React.FC<Props> = props => {
	const newWindow = props.newWindow;
	const onWindowClose = useCallback(() => {
		if (newWindow) {
			props.dispatch({ type: 'WINDOW_CLOSE', windowId: props.windowId });
		}
	}, [props.dispatch, props.windowId, newWindow]);

	const onWindowFocus = useCallback(() => {
		props.dispatch({ type: 'WINDOW_FOCUS', windowId: props.windowId });
	}, [props.dispatch, props.windowId]);

	const noteId = props.secondaryWindowNoteIds[props.windowId][0] ?? '';
	const editor = noteId ? <NoteEditor
		bodyEditor={props.bodyEditor}
		noteId={noteId}
		isProvisional={props.provisionalNoteIds.includes(noteId)}
	/> : null;

	const windowContent = <NewWindowOrIFrame
		newWindow={newWindow}
		onClose={onWindowClose}
		onFocus={onWindowFocus}
	>
		<LibraryStyleRoot>
			<WindowCommandHandler />
			{editor}
		</LibraryStyleRoot>
		<StyleSheetContainer />
	</NewWindowOrIFrame>;
	return newWindow ? windowContent : editor;
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

	return {
		themeId: state.settings.theme,
		provisionalNoteIds: state.provisionalNoteIds,
		secondaryWindowNoteIds: stateUtils.windowIdToSelectedNoteIds(state),
		activeWindowId: stateUtils.activeWindowId(state),
		bodyEditor,
	};
})(NoteEditorWrapper);
