import * as React from 'react';
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NoteEditorContent from './NoteEditorContent';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame from '../NewWindowOrIFrame';
import WindowCommandHandler from '../WindowCommandHandler/WindowCommandHandler';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';

import * as toggleEditors from './commands/toggleEditors';

const { StyleSheetManager } = require('styled-components');
// Note: Transitive dependencies used only by react-select. Remove if react-select is removed.
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { stateUtils } from '@joplin/lib/reducer';
import CommandService from '@joplin/lib/services/CommandService';
import getWindowCommandPriority from './utils/getWindowCommandPriority';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	dispatch: Dispatch;
	themeId: number;

	isSafeMode: boolean;
	codeView: boolean;
	legacyMarkdown: boolean;

	newWindow: boolean;
	windowId: string;
	activeWindowId: string;

	secondaryWindowNoteIds: Record<string, string[]>;
	provisionalNoteIds: string[];
}

interface UseToggleEditorsProps {
	isSafeMode: boolean;
	codeView: boolean;
	legacyMarkdown: boolean;
	containerRef: RefObject<HTMLDivElement>;
}

const useToggleEditors = (props: UseToggleEditorsProps) => {
	const [codeView, setCodeView] = useState(props.codeView);

	// useLayoutEffect: Run the effect as soon as possible -- renders of child components (toolbar buttons)
	// expect the command to have a registered runtime.
	useNowEffect(() => {
		const runtime = toggleEditors.runtime(setCodeView);
		const registeredRuntime = CommandService.instance().registerRuntime(
			toggleEditors.declaration.name,
			{ ...runtime, getPriority: () => getWindowCommandPriority(props.containerRef) },
			true,
		);

		return () => {
			registeredRuntime.deregister();
		};
	}, [props.containerRef]);

	useEffect(() => {
		Setting.setValue('editor.codeView', codeView);
	}, [codeView]);

	return useMemo(() => {
		let bodyEditor = codeView ? 'CodeMirror6' : 'TinyMCE';

		if (props.isSafeMode) {
			bodyEditor = 'PlainText';
		} else if (codeView && props.legacyMarkdown) {
			bodyEditor = 'CodeMirror5';
		}

		return bodyEditor;
	}, [codeView, props.isSafeMode, props.legacyMarkdown]);
};

const NoteEditorWrapper: React.FC<Props> = props => {
	const containerRef = useRef<HTMLDivElement>(null);

	const bodyEditor = useToggleEditors({
		isSafeMode: props.isSafeMode, codeView: props.codeView, legacyMarkdown: props.legacyMarkdown, containerRef: containerRef,
	});
	const noteId = props.secondaryWindowNoteIds[props.windowId][0] ?? '';
	const editor = noteId ? <div className='note-editor-wrapper' ref={containerRef}>
		<NoteEditorContent
			bodyEditor={bodyEditor}
			noteId={noteId}
			isProvisional={props.provisionalNoteIds.includes(noteId)}
		/>
	</div> : null;

	const newWindow = props.newWindow;
	const onWindowClose = useCallback(() => {
		if (newWindow) {
			props.dispatch({ type: 'WINDOW_CLOSE', windowId: props.windowId });
		}
	}, [props.dispatch, props.windowId, newWindow]);

	const onWindowFocus = useCallback(() => {
		props.dispatch({ type: 'WINDOW_FOCUS', windowId: props.windowId });
	}, [props.dispatch, props.windowId]);

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
	return {
		themeId: state.settings.theme,
		isSafeMode: state.settings.isSafeMode,
		codeView: state.settings['editor.codeView'],
		legacyMarkdown: state.settings['editor.legacyMarkdown'],
		provisionalNoteIds: state.provisionalNoteIds,
		secondaryWindowNoteIds: stateUtils.windowIdToSelectedNoteIds(state),
		activeWindowId: stateUtils.activeWindowId(state),
	};
})(NoteEditorWrapper);
