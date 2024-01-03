
import * as React from 'react';
import ExtendedWebView, { OnMessageCallback, WebViewControl } from '../../components/ExtendedWebView';
import Setting from '@joplin/lib/models/Setting';
import { Ref, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import PluginApiGlobal from '@joplin/lib/services/plugins/api/Global';
import shim from '@joplin/lib/shim';
import { PluginApi, PluginWebViewApi } from './types';
import { WebViewMessageEvent } from 'react-native-webview';
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';


export interface PluginRunnerWebViewControl {
	runPlugin(plugin: Plugin, pluginApi: PluginApiGlobal): void;
}

interface Props {
}

const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8"/>
</head>
<body>
</body>
</html>
`;

const PluginRunnerWebView = (_props: Props, ref: Ref<PluginRunnerWebViewControl>) => {
	const webviewRef = useRef<WebViewControl>();
	const messageEventListeners = useRef<OnMessageCallback[]>([]);

	useImperativeHandle(ref, (): PluginRunnerWebViewControl => {
		return {
			runPlugin: (plugin: Plugin, pluginApi: PluginApiGlobal): RemoteMessenger<PluginApi, PluginWebViewApi> => {
				if (!webviewRef.current) {
					throw new Error('WebView not loaded');
				}

				const pluginId = plugin.id;
				const messageChannelId = `plugin-message-channel-${pluginId}`;
				const messenger = new RNToWebViewMessenger<PluginApi, PluginWebViewApi>(
					messageChannelId, webviewRef.current, { api: pluginApi },
				);

				messageEventListeners.current.push(messenger.onWebViewMessage);
				messenger.onWebViewLoaded();

				webviewRef.current.injectJS(`
					const pluginScript = ${JSON.stringify(plugin.scriptText)};
					pluginBackgroundPageBundle.runPlugin(
						${JSON.stringify(shim.injectedJs('pluginBackgroundPage'))},
						${JSON.stringify(plugin.scriptText)},
						${JSON.stringify(messageChannelId)},
					);
				`);

				return messenger;
			},
		};
	}, []);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
		`;
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		for (const eventListener of messageEventListeners.current) {
			eventListener(event);
		}
	}, []);

	return (
		<ExtendedWebView
			themeId={Setting.THEME_LIGHT}
			webviewInstanceId='PluginRunner'
			html={html}
			injectedJavaScript={injectedJs}
			onMessage={onMessage}
			onError={()=>{}}
			ref={webviewRef}
		/>
	);
};

export default PluginRunnerWebView;
