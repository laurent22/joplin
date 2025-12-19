import * as React from 'react';

import useOnMessage, { HandleMessageCallback, OnMarkForDownloadCallback } from './hooks/useOnMessage';
import { useRef, useCallback } from 'react';
import { View, ViewStyle } from 'react-native';
import ExtendedWebView from '../ExtendedWebView';
import { WebViewControl } from '../ExtendedWebView/types';
import useOnResourceLongPress from './hooks/useOnResourceLongPress';
import useRerenderHandler, { ResourceInfo } from './hooks/useRerenderHandler';
import useSource from './hooks/useSource';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { MarkupLanguage } from '@joplin/renderer';
import shim from '@joplin/lib/shim';
import CommandService from '@joplin/lib/services/CommandService';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import useWebViewSetup from '../../contentScripts/rendererBundle/useWebViewSetup';
import { OnScrollCallback } from '../../contentScripts/rendererBundle/types';

interface Props {
	themeId: number;
	style: ViewStyle;
	fontSize: number;
	noteBody: string;
	noteMarkupLanguage: MarkupLanguage;
	highlightedKeywords: string[];
	noteResources: Record<string, ResourceInfo>;
	paddingBottom: number;
	initialScrollPercent: number|null;
	noteHash: string;
	onCheckboxChange?: HandleMessageCallback;
	onRequestEditResource?: HandleMessageCallback;
	onMarkForDownload?: OnMarkForDownloadCallback;
	onScroll: OnScrollCallback;
	onLoadEnd?: ()=> void;
	pluginStates: PluginStates;
}

const onJoplinLinkClick = async (message: string) => {
	try {
		await CommandService.instance().execute('openItem', message);
	} catch (error) {
		await shim.showErrorDialog(error.message);
	}
};

function NoteBodyViewer(props: Props) {
	const webviewRef = useRef<WebViewControl>(null);

	const onScroll = props.onScroll;

	const onResourceLongPress = useOnResourceLongPress(
		{
			onJoplinLinkClick,
			onRequestEditResource: props.onRequestEditResource,
		},
	);

	const onPostMessage = useOnMessage(props.noteBody, {
		onMarkForDownload: props.onMarkForDownload,
		onJoplinLinkClick,
		onRequestEditResource: props.onRequestEditResource,
		onCheckboxChange: props.onCheckboxChange,
		onResourceLongPress,
	});

	const { api: renderer, pageSetup, webViewEventHandlers, hasPluginScripts } = useWebViewSetup({
		webviewRef,
		onBodyScroll: onScroll,
		onPostMessage,
		pluginStates: props.pluginStates,
		themeId: props.themeId,
	});

	useRerenderHandler({
		renderer,
		fontSize: props.fontSize,
		noteBody: props.noteBody,
		noteMarkupLanguage: props.noteMarkupLanguage,
		themeId: props.themeId,
		highlightedKeywords: props.highlightedKeywords,
		noteResources: props.noteResources,
		noteHash: props.noteHash,
		initialScrollPercent: props.initialScrollPercent,

		paddingBottom: props.paddingBottom,
	});

	const onLoadEnd = useCallback(() => {
		webViewEventHandlers.onLoadEnd();
		if (props.onLoadEnd) props.onLoadEnd();
	}, [props.onLoadEnd, webViewEventHandlers]);

	const { html, js } = useSource(pageSetup, props.themeId);

	return (
		<View style={props.style}>
			<ExtendedWebView
				ref={webviewRef}
				webviewInstanceId='NoteBodyViewer'
				testID='NoteBodyViewer'
				html={html}
				allowFileAccessFromJs={true}
				injectedJavaScript={js}
				mixedContentMode="always"
				onLoadEnd={onLoadEnd}
				onMessage={webViewEventHandlers.onMessage}
				hasPluginScripts={hasPluginScripts}
			/>
		</View>
	);
}

export default connect((state: AppState) => ({
	themeId: state.settings.theme,
	fontSize: state.settings['style.viewer.fontSize'],
	pluginStates: state.pluginService.plugins,
}))(NoteBodyViewer);
