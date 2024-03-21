import { Dispatch, RefObject, SetStateAction, useEffect, useMemo } from 'react';
import { WebViewControl } from '../../ExtendedWebView';
import { OnScrollCallback, OnWebViewMessageHandler } from '../types';
import RNToWebViewMessenger from '../../../utils/ipc/RNToWebViewMessenger';
import { NoteViewerLocalApi, NoteViewerRemoteApi } from '../bundledJs/types';
import shim from '@joplin/lib/shim';
import { WebViewMessageEvent } from 'react-native-webview';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useRenderer');

interface Props {
	webviewRef: RefObject<WebViewControl>;
	onScroll: OnScrollCallback;
	onPostMessage: (message: string)=> void;
	setOnWebViewMessage: Dispatch<SetStateAction<OnWebViewMessageHandler>>;
	webViewLoaded: boolean;

	tempDir: string;
}

const onPostPluginMessage = async (contentScriptId: string, message: any) => {
	logger.debug(`Handling message from content script: ${contentScriptId}:`, message);

	const pluginService = PluginService.instance();
	const pluginId = pluginService.pluginIdByContentScriptId(contentScriptId);
	if (!pluginId) {
		throw new Error(`Plugin not found for content script with ID ${contentScriptId}`);
	}

	const plugin = pluginService.pluginById(pluginId);
	return plugin.emitContentScriptMessage(contentScriptId, message);
};

const useRenderer = (props: Props) => {
	const messenger = useMemo(() => {
		const fsDriver = shim.fsDriver();
		const localApi = {
			onScroll: props.onScroll,
			onPostMessage: props.onPostMessage,
			onPostPluginMessage,
			fsDriver: {
				writeFile: async (path: string, content: string, encoding?: string) => {
					if (!await fsDriver.exists(props.tempDir)) {
						await fsDriver.mkdir(props.tempDir);
					}
					// To avoid giving the WebView access to the entire main tempDir,
					// we use props.tempDir (which should be different).
					path = fsDriver.resolveRelativePathWithinDir(props.tempDir, path);
					return await fsDriver.writeFile(path, content, encoding);
				},
				exists: fsDriver.exists,
				cacheCssToFile: fsDriver.cacheCssToFile,
			},
		};
		return new RNToWebViewMessenger<NoteViewerRemoteApi, NoteViewerLocalApi>(
			'note-viewer', props.webviewRef, localApi,
		);
	}, [props.onScroll, props.onPostMessage, props.webviewRef, props.tempDir]);

	useEffect(() => {
		props.setOnWebViewMessage(() => (event: WebViewMessageEvent) => {
			messenger.onWebViewMessage(event);
		});
	}, [messenger, props.setOnWebViewMessage]);

	useEffect(() => {
		if (props.webViewLoaded) {
			messenger.onWebViewLoaded();
		}
	}, [messenger, props.webViewLoaded]);

	return useMemo(() => {
		return messenger.remoteApi.renderer;
	}, [messenger]);
};

export default useRenderer;
