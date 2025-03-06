import * as React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import NoteEditor from './NoteEditor';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame, { WindowMode } from '../NewWindowOrIFrame';
import WindowCommandsAndDialogs from '../WindowCommandsAndDialogs/WindowCommandsAndDialogs';

const { StyleSheetManager } = require('styled-components');
// Note: Transitive dependencies used only by react-select. Remove if react-select is removed.
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { stateUtils } from '@joplin/lib/reducer';

interface Props {
	dispatch: Dispatch;
	themeId: number;

	newWindow: boolean;
	windowId: string;
	activeWindowId: string;
	startupPluginsLoaded: boolean;
}

const emptyCallback = () => {};
const useWindowTitle = (isNewWindow: boolean) => {
	const [title, setTitle] = useState('Untitled');

	if (!isNewWindow) {
		return {
			windowTitle: 'Editor',
			onNoteTitleChange: emptyCallback,
		};
	}

	return { windowTitle: `Joplin - ${title}`, onNoteTitleChange: setTitle };
};

const SecondaryWindow: React.FC<Props> = props => {
	const containerRef = useRef<HTMLDivElement>(null);

	const { windowTitle, onNoteTitleChange } = useWindowTitle(props.newWindow);
	const editor = <div className='note-editor-wrapper' ref={containerRef}>
		<NoteEditor
			windowId={props.windowId}
			onTitleChange={onNoteTitleChange}
			startupPluginsLoaded={props.startupPluginsLoaded}
		/>
	</div>;

	const newWindow = props.newWindow;
	const onWindowClose = useCallback(() => {
		if (newWindow) {
			props.dispatch({ type: 'WINDOW_CLOSE', windowId: props.windowId });
		}
	}, [props.dispatch, props.windowId, newWindow]);

	const onWindowFocus = useCallback(() => {
		// Verify that the window still has focus (e.g. to handle the case where the event was delayed).
		if (containerRef.current?.ownerDocument.hasFocus()) {
			props.dispatch({
				type: 'WINDOW_FOCUS',
				windowId: props.windowId,
				lastWindowId: props.activeWindowId,
			});
		}
	}, [props.dispatch, props.windowId, props.activeWindowId]);

	return <NewWindowOrIFrame
		mode={newWindow ? WindowMode.NewWindow : WindowMode.Iframe}
		windowId={props.windowId}
		onClose={onWindowClose}
		onFocus={onWindowFocus}
		title={windowTitle}
	>
		<LibraryStyleRoot>
			<WindowCommandsAndDialogs windowId={props.windowId} />
			{editor}
		</LibraryStyleRoot>
		<StyleSheetContainer />
	</NewWindowOrIFrame>;
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
		startupPluginsLoaded: state.startupPluginsLoaded,
	};
})(SecondaryWindow);
