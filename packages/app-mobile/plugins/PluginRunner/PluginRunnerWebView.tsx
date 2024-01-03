
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import Setting from '@joplin/lib/models/Setting';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import shim from '@joplin/lib/shim';
import { WebViewMessageEvent } from 'react-native-webview';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { useStore } from 'react-redux';

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

const PluginRunnerWebView = (_props: Props) => {
	const webviewRef = useRef<WebViewControl>();

	const pluginRunner = useMemo(() => {
		return new PluginRunner(webviewRef);
	}, []);

	const store = useStore();

	useEffect(() => {
		void loadPlugins(pluginRunner, store);
	}, [pluginRunner, store]);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
		`;
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
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
			ref={webviewRef}
		/>
	);
};

export default PluginRunnerWebView;
