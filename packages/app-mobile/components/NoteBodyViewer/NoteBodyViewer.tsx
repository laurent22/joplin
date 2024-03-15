import * as React from 'react';

import useOnMessage, { HandleMessageCallback, OnMarkForDownloadCallback } from './hooks/useOnMessage';
import { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { View } from 'react-native';
import BackButtonDialogBox from '../BackButtonDialogBox';
import ExtendedWebView, { WebViewControl } from '../ExtendedWebView';
import useOnResourceLongPress from './hooks/useOnResourceLongPress';
import useRenderer from './hooks/useRenderer';
import { OnWebViewMessageHandler } from './types';
import useRerenderHandler from './hooks/useRerenderHandler';
import useSource from './hooks/useSource';
import Setting from '@joplin/lib/models/Setting';
import uuid from '@joplin/lib/uuid';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import useContentScripts from './hooks/useContentScripts';
import Logger from '@joplin/utils/Logger';

interface Props {
	themeId: number;
	style: any;
	noteBody: string;
	noteMarkupLanguage: number;
	highlightedKeywords: string[];
	noteResources: any;
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

const logger = Logger.create('NoteBodyViewer');

export default function NoteBodyViewer(props: Props) {
	const dialogBoxRef = useRef(null);
	const webviewRef = useRef<WebViewControl>(null);

	useEffect(() => {
		logger.debug('WebView load started');
	}, []);

	const onScroll = useCallback(async (scrollTop: number) => {
		props.onScroll(scrollTop);
	}, [props.onScroll]);

	const onResourceLongPress = useOnResourceLongPress(
		{
			onJoplinLinkClick: props.onJoplinLinkClick,
			onRequestEditResource: props.onRequestEditResource,
		},
		dialogBoxRef,
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
		logger.debug('WebView loaded');
		setWebViewLoaded(true);
		if (props.onLoadEnd) props.onLoadEnd();
	}, [props.onLoadEnd]);

	const onError = (errorEvent: any) => {
		logger.error('WebView error', errorEvent?.nativeEvent?.description);
	};

	const BackButtonDialogBox_ = BackButtonDialogBox as any;

	const { html, injectedJs } = useSource(tempDir, props.themeId);

	return (
		<View style={props.style}>
			<ExtendedWebView
				ref={webviewRef}
				webviewInstanceId='NoteBodyViewer'
				html={html}
				allowFileAccessFromJs={true}
				injectedJavaScript={injectedJs}
				mixedContentMode="always"
				onLoadEnd={onLoadEnd}
				onError={onError}
				onMessage={onWebViewMessage}
			/>
			<BackButtonDialogBox_ ref={dialogBoxRef}/>
		</View>
	);
}
