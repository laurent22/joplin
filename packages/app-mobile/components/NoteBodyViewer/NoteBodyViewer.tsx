import * as React from 'react';

import useOnMessage, { HandleMessageCallback, OnMarkForDownloadCallback } from './hooks/useOnMessage';
import { useRef, useCallback, useState, useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import ExtendedWebView from '../ExtendedWebView';
import { WebViewControl } from '../ExtendedWebView/types';
import useOnResourceLongPress from './hooks/useOnResourceLongPress';
import useRenderer from './hooks/useRenderer';
import { OnWebViewMessageHandler } from './types';
import useRerenderHandler, { ResourceInfo } from './hooks/useRerenderHandler';
import useSource from './hooks/useSource';
import Setting from '@joplin/lib/models/Setting';
import uuid from '@joplin/lib/uuid';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import useContentScripts from './hooks/useContentScripts';
import { MarkupLanguage } from '@joplin/renderer';

interface Props {
	themeId: number;
	style: ViewStyle;
	fontSize: number;
	noteBody: string;
	noteMarkupLanguage: MarkupLanguage;
	highlightedKeywords: string[];
	noteResources: Record<string, ResourceInfo>;
	paddingBottom: number;
	initialScroll: number|null;
	noteHash: string;
	onJoplinLinkClick: HandleMessageCallback;
	onCheckboxChange?: HandleMessageCallback;
	onRequestEditResource?: HandleMessageCallback;
	onMarkForDownload?: OnMarkForDownloadCallback;
	onScroll: (scrollTop: number)=> void;
	onLoadEnd?: ()=> void;
	pluginStates: PluginStates;
}

export default function NoteBodyViewer(props: Props) {
	const webviewRef = useRef<WebViewControl>(null);

	const onScroll = useCallback(async (scrollTop: number) => {
		props.onScroll(scrollTop);
	}, [props.onScroll]);

	const onResourceLongPress = useOnResourceLongPress(
		{
			onJoplinLinkClick: props.onJoplinLinkClick,
			onRequestEditResource: props.onRequestEditResource,
		},
	);

	const onPostMessage = useOnMessage(props.noteBody, {
		onMarkForDownload: props.onMarkForDownload,
		onJoplinLinkClick: props.onJoplinLinkClick,
		onRequestEditResource: props.onRequestEditResource,
		onCheckboxChange: props.onCheckboxChange,
		onResourceLongPress,
	});

	const [webViewLoaded, setWebViewLoaded] = useState(false);
	const [onWebViewMessage, setOnWebViewMessage] = useState<OnWebViewMessageHandler>(()=>()=>{});


	// The renderer can write to whichever temporary directory we choose. As such,
	// we use a subdirectory of the main temporary directory for security reasons.
	const tempDir = useMemo(() => {
		return `${Setting.value('tempDir')}/${uuid.createNano()}`;
	}, []);

	const renderer = useRenderer({
		webViewLoaded,
		onScroll,
		webviewRef,
		onPostMessage,
		setOnWebViewMessage,
		tempDir,
	});

	const contentScripts = useContentScripts(props.pluginStates);

	useRerenderHandler({
		renderer,
		fontSize: props.fontSize,
		noteBody: props.noteBody,
		noteMarkupLanguage: props.noteMarkupLanguage,
		themeId: props.themeId,
		highlightedKeywords: props.highlightedKeywords,
		noteResources: props.noteResources,
		noteHash: props.noteHash,
		initialScroll: props.initialScroll,

		paddingBottom: props.paddingBottom,

		contentScripts,
	});

	const onLoadEnd = useCallback(() => {
		setWebViewLoaded(true);
		if (props.onLoadEnd) props.onLoadEnd();
	}, [props.onLoadEnd]);

	const { html, injectedJs } = useSource(tempDir, props.themeId);

	return (
		<View style={props.style}>
			<ExtendedWebView
				ref={webviewRef}
				webviewInstanceId='NoteBodyViewer'
				testID='NoteBodyViewer'
				html={html}
				allowFileAccessFromJs={true}
				injectedJavaScript={injectedJs}
				mixedContentMode="always"
				onLoadEnd={onLoadEnd}
				onMessage={onWebViewMessage}
			/>
		</View>
	);
}
