
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import shim from '@joplin/lib/shim';
import { WebViewMessageEvent } from 'react-native-webview';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { connect, useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { AppState } from '../../utils/types';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import PluginViewController from './PluginViewController';

interface Props {
	serializedPluginSettings: string;
	pluginStates: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
	themeId: number;
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

const useStyles = (webViewVisible: boolean) => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		return StyleSheet.create({
			containerStyle: {
				backgroundColor: 'transparent',
				display: webViewVisible ? 'flex' : 'none',
				zIndex: webViewVisible ? 10 : -1,
				width: windowSize.width,
				height: windowSize.height,
				position: 'absolute',
			},
			webview: {
				backgroundColor: 'transparent',
				flex: webViewVisible ? 1 : 0,
				flexGrow: webViewVisible ? 1 : 0,
				width: webViewVisible ? undefined : 0,
				height: webViewVisible ? undefined : 0,
			},
		});
	}, [webViewVisible, windowSize]);
};

const PluginRunnerWebViewComponent: React.FC<Props> = props => {
	const webviewRef = useRef<WebViewControl>();

	const pluginRunner = useMemo(() => {
		return new PluginRunner(webviewRef);
	}, []);

	const [webViewVisible, setWebviewVisible] = useState(true);

	const pluginViewController = useMemo(() => {
		return new PluginViewController(webviewRef, setWebviewVisible);
	}, [setWebviewVisible]);

	useEffect(() => {
		pluginViewController.onPluginHtmlContentsUpdated(props.pluginHtmlContents);
	}, [props.pluginHtmlContents, pluginViewController]);

	const [webviewLoaded, setLoaded] = useState(false);
	const store = useStore();

	useAsyncEffect(async (event) => {
		if (!webviewLoaded) {
			return;
		}

		const pluginService = PluginService.instance();
		const pluginSettings = pluginService.unserializePluginSettings(props.serializedPluginSettings);

		void loadPlugins(pluginRunner, pluginSettings, store, event);
	}, [pluginRunner, store, webviewLoaded, props.serializedPluginSettings]);

	const pluginViews = useMemo(() => {
		return pluginUtils.viewInfosByType(props.pluginStates, 'webview');
	}, [props.pluginStates]);

	useEffect(() => {
		pluginViewController.onViewInfosUpdated(pluginViews);
	}, [pluginViews, pluginViewController]);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
			console.log('Loaded PluginRunnerWebView.');
		`;
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		logger.debug('Plugin message', event.nativeEvent.data);
		pluginRunner.onWebviewMessage(event);
		pluginViewController.onWebViewMessage(event);
	}, [pluginViewController, pluginRunner]);


	const styles = useStyles(webViewVisible);
	const webView = (
		<ExtendedWebView
			style={styles.webview}
			themeId={props.themeId}
			webviewInstanceId='PluginRunner'
			html={html}
			injectedJavaScript={injectedJs}
			onMessage={onMessage}
			onError={()=>{}}
			onLoadEnd={() => setLoaded(true)}
			ref={webviewRef}
		/>
	);

	return (
		<View style={styles.containerStyle}>
			{webView}
		</View>
	);
};

export default connect((state: AppState) => {
	const result: Props = {
		serializedPluginSettings: state.settings['plugins.states'],
		pluginStates: state.pluginService.plugins,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		themeId: state.settings.theme,
	};
	return result;
})(PluginRunnerWebViewComponent);
