
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import Setting from '@joplin/lib/models/Setting';
import { useCallback, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import { WebViewMessageEvent } from 'react-native-webview';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { useStore } from 'react-redux';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import Logger from '@joplin/utils/Logger';

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

	useAsyncEffect(async () => {
		if (!webviewLoaded) {
			return;
		}

		await loadPlugins(pluginRunner, store);
	}, [pluginRunner, store, webviewLoaded]);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
			console.log('Loaded PluginRunnerWebView.');
		`;
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		logger.debug('plugin message', event.nativeEvent.data);
		pluginRunner.onWebviewMessage(event);
	}, [pluginRunner]);

	return (
		<ExtendedWebView
			style={{ display: 'none' }}
			themeId={Setting.THEME_LIGHT}
			webviewInstanceId='PluginRunner'
			html={html}
			injectedJavaScript={injectedJs}
			onMessage={onMessage}
			onError={()=>{}}
			onLoadEnd={() => setLoaded(true)}
			ref={webviewRef}
		/>
	);
};

export default PluginRunnerWebView;
