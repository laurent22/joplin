
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import Setting from '@joplin/lib/models/Setting';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import { WebViewMessageEvent } from 'react-native-webview';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { View } from 'react-native';
import PluginService from '@joplin/lib/services/plugins/PluginService';

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

const logger = Logger.create('PluginRunnerWebView');

const PluginRunnerWebView = (_props: Props) => {
	const webviewRef = useRef<WebViewControl>();

	const pluginRunner = useMemo(() => {
		return new PluginRunner(webviewRef);
	}, []);

	const [webviewLoaded, setLoaded] = useState(false);
	const store = useStore();

	useEffect(() => {
		if (!webviewLoaded) {
			return () => {};
		}

		void loadPlugins(pluginRunner, store);

		return () => {
			const pluginService = PluginService.instance();
			for (const id of pluginService.pluginIds) {
				void pluginService.unloadPlugin(id);
			}
		};
	}, [pluginRunner, store, webviewLoaded]);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
			console.log('Loaded PluginRunnerWebView.');
		`;
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		logger.debug('Plugin message', event.nativeEvent.data);
		pluginRunner.onWebviewMessage(event);
	}, [pluginRunner]);

	return (
		<View style={{ display: 'none', zIndex: -1, position: 'absolute' }}>
			<ExtendedWebView
				style={{ width: 0, height: 0 }}
				themeId={Setting.THEME_LIGHT}
				webviewInstanceId='PluginRunner'
				html={html}
				injectedJavaScript={injectedJs}
				onMessage={onMessage}
				onError={()=>{}}
				onLoadEnd={() => setLoaded(true)}
				ref={webviewRef}
			/>
		</View>
	);
};

export default PluginRunnerWebView;
