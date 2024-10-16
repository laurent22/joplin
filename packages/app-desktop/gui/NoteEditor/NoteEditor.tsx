import * as React from 'react';
import { RefObject, useCallback, useMemo, useRef, useState } from 'react';
import NoteEditorContent from './NoteEditorContent';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame, { WindowMode } from '../NewWindowOrIFrame';
import WindowCommandHandler from '../WindowCommandHandler/WindowCommandHandler';

const { StyleSheetManager } = require('styled-components');
// Note: Transitive dependencies used only by react-select. Remove if react-select is removed.
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { stateUtils } from '@joplin/lib/reducer';

interface Props {
	dispatch: Dispatch;
	themeId: number;

	isSafeMode: boolean;
	codeView: boolean;
	legacyMarkdown: boolean;

	newWindow: boolean;
	windowId: string;
	activeWindowId: string;
}

interface UseToggleEditorsProps {
	isSafeMode: boolean;
	codeView: boolean;
	legacyMarkdown: boolean;
	containerRef: RefObject<HTMLDivElement>;
}

const useEditorKey = (props: UseToggleEditorsProps) => {
	return useMemo(() => {
		let bodyEditor = props.codeView ? 'CodeMirror6' : 'TinyMCE';

		if (props.isSafeMode) {
			bodyEditor = 'PlainText';
		} else if (props.codeView && props.legacyMarkdown) {
			bodyEditor = 'CodeMirror5';
		}

		return bodyEditor;
	}, [props.codeView, props.isSafeMode, props.legacyMarkdown]);
};

const NoteEditorWrapper: React.FC<Props> = props => {
	const containerRef = useRef<HTMLDivElement>(null);

	const bodyEditor = useEditorKey({
		isSafeMode: props.isSafeMode, codeView: props.codeView, legacyMarkdown: props.legacyMarkdown, containerRef: containerRef,
	});
	const editor = <div className='note-editor-wrapper' ref={containerRef}>
		<NoteEditorContent
			bodyEditor={bodyEditor}
			windowId={props.windowId}
		/>
	</div>;

	const newWindow = props.newWindow;
	const onWindowClose = useCallback(() => {
		if (newWindow) {
			props.dispatch({ type: 'WINDOW_CLOSE', windowId: props.windowId });
		}
	}, [props.dispatch, props.windowId, newWindow]);

	const onWindowFocus = useCallback(() => {
		props.dispatch({
			type: 'WINDOW_FOCUS',
			windowId: props.windowId,
			lastWindowId: props.activeWindowId,
		});
	}, [props.dispatch, props.windowId, props.activeWindowId]);

	const windowContent = <NewWindowOrIFrame
		mode={newWindow ? WindowMode.NewWindow : WindowMode.Iframe}
		windowId={props.windowId}
		onClose={onWindowClose}
		onFocus={onWindowFocus}
	>
		<LibraryStyleRoot>
			<WindowCommandHandler windowId={props.windowId} />
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

interface ConnectProps {
	windowId: string;
}

export default connect((state: AppState, ownProps: ConnectProps) => {
	// May be undefined if the window hasn't opened
	const windowState = stateUtils.windowStateById(state, ownProps.windowId);

	return {
		themeId: state.settings.theme,
		isSafeMode: state.settings.isSafeMode,
		codeView: windowState?.editorCodeView ?? state.settings['editor.codeView'],
		legacyMarkdown: state.settings['editor.legacyMarkdown'],
		activeWindowId: stateUtils.activeWindowId(state),
	};
})(NoteEditorWrapper);
