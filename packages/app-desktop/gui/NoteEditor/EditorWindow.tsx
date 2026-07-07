import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StyleSheetContainer from '../StyleSheets/StyleSheetContainer';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { Dispatch } from 'redux';
import NewWindowOrIFrame, { WindowMode } from '../NewWindowOrIFrame';
import WindowCommandsAndDialogs from '../WindowCommandsAndDialogs/WindowCommandsAndDialogs';

import { StyleSheetManager } from 'styled-components';
// Note: Transitive dependencies used only by react-select. Remove if react-select is removed.
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { stateUtils } from '@joplin/lib/reducer';
import ResizableLayout, { RenderItemEvent } from '../ResizableLayout/ResizableLayout';
import { LayoutItem } from '../ResizableLayout/utils/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import layoutKeyToLabel from '../../utils/layout/layoutKeyToLabel';
import MainLayoutPane from '../MainLayoutPane';

interface Props {
	dispatch: Dispatch;
	themeId: number;

	layout: LayoutItem;
	plugins: PluginStates;
	newWindow: boolean;
	windowId: string;
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

const defaultLayout = {
	key: 'root',
	isRoot: true,
	width: 500,
	height: 500,
	children: [
		{ key: 'editor' },
		{ key: 'chatPanel', width: 340, visible: false },
	],
};

const useLayout = ({ windowId, layout, plugins, dispatch }: Props) => {
	const [window, setWindow] = useState<Window|null>(null);
	layout ??= defaultLayout;

	const onUpdateLayout = useCallback((newLayout: LayoutItem) => {
		dispatch({
			type: 'WINDOW_LAYOUT_SET',
			windowId,
			value: newLayout,
		});
	}, [dispatch, windowId]);

	const onResize = useCallback((event: { layout: LayoutItem }) => {
		onUpdateLayout(event.layout);
	}, [onUpdateLayout]);

	const onKeyToLabel = useCallback((key: string) => {
		return layoutKeyToLabel(key, plugins);
	}, [plugins]);

	const currentLayoutRef = useRef(layout);
	currentLayoutRef.current = layout;

	const onRefreshLayoutSize = useCallback((window: Window) => {
		const layout = currentLayoutRef.current;
		if (layout.width !== window.innerWidth || layout.height !== window.innerHeight) {
			const newLayout = {
				...currentLayoutRef.current,
				width: window.innerWidth,
				height: window.innerHeight,
			};
			onUpdateLayout(newLayout);
		}
	}, [onUpdateLayout]);

	useEffect(() => {
		if (!window) return ()=>{};

		const onWindowResize = () => onRefreshLayoutSize(window);
		window.addEventListener('resize', onWindowResize);
		onWindowResize();

		return () => {
			window.removeEventListener('resize', onWindowResize);
		};
	}, [window, onRefreshLayoutSize]);

	return {
		layout,
		onWindow: setWindow,
		onResize,
		onUpdate: onUpdateLayout,
		onKeyToLabel,
	};
};

const SecondaryWindow: React.FC<Props> = props => {
	const { windowTitle, onNoteTitleChange } = useWindowTitle(props.newWindow);

	const newWindow = props.newWindow;
	const onWindowClose = useCallback(() => {
		if (newWindow) {
			props.dispatch({ type: 'WINDOW_CLOSE', windowId: props.windowId });
		}
	}, [props.dispatch, props.windowId, newWindow]);

	const layout = useLayout(props);

	const onRenderItem = useCallback((key: string, event: RenderItemEvent) => {
		return <MainLayoutPane
			key={key}
			contentKey={key}
			windowId={props.windowId}
			onNoteTitleChange={onNoteTitleChange}
			event={event}
			onUpdateLayout={layout.onUpdate}
			layout={layout.layout}
		/>;
	}, [props.windowId, onNoteTitleChange, layout.layout, layout.onUpdate]);

	return <NewWindowOrIFrame
		onWindow={layout.onWindow}
		mode={newWindow ? WindowMode.NewWindow : WindowMode.Iframe}
		windowId={props.windowId}
		onClose={onWindowClose}
		title={windowTitle}
	>
		<div id='react-root' className='secondary-window-root'>
			<LibraryStyleRoot>
				<WindowCommandsAndDialogs windowId={props.windowId} />
				<ResizableLayout
					layout={layout.layout}
					onResize={layout.onResize}
					onMoveButtonClick={() => {}}
					renderItem={onRenderItem}
					layoutKeyToLabel={layout.onKeyToLabel}
					moveMode={false}
					moveModeMessage={''}
				/>
			</LibraryStyleRoot>
			<StyleSheetContainer />
		</div>
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
		layout: windowState.secondaryWindowLayout,
		codeView: windowState?.editorCodeView ?? state.settings['editor.codeView'],
		legacyMarkdown: state.settings['editor.legacyMarkdown'],
		plugins: state.pluginService.plugins,
	};
})(SecondaryWindow);
