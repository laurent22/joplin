
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import { useCallback, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { connect, useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { View, ViewStyle } from 'react-native';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { AppState } from '../../utils/types';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

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
	<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
	<meta charset="utf-8"/>
</head>
<body>
</body>
</html>
`;

const logger = Logger.create('PluginRunnerWebView');

const styles = {
	containerStyle: {
		backgroundColor: 'transparent',
		display: 'none',
		zIndex: -1,
		width: 0,
		height: 0,
		position: 'absolute',
	} as ViewStyle,
	webview: {
		width: 0,
		height: 0,
	},
};

const usePluginSettings = (serializedPluginSettings: string) => {
	return useMemo(() => {
		const pluginService = PluginService.instance();
		return pluginService.unserializePluginSettings(serializedPluginSettings);
	}, [serializedPluginSettings]);
};

const usePlugins = (
	pluginRunner: PluginRunner,
	webviewLoaded: boolean,
	pluginSettings: PluginSettings,
) => {
	const store = useStore();

	useAsyncEffect(async (event) => {
		if (!webviewLoaded) {
			return;
		}

		void loadPlugins(pluginRunner, pluginSettings, store, event);
	}, [pluginRunner, store, webviewLoaded, pluginSettings]);
};

const PluginRunnerWebViewComponent: React.FC<Props> = props => {
	const webviewRef = useRef<WebViewControl>();

	const [webviewLoaded, setLoaded] = useState(false);
	const [webviewReloadCounter, setWebviewReloadCounter] = useState(0);

	const pluginRunner = useMemo(() => {
		if (webviewReloadCounter > 1) {
			logger.debug(`Reloading the plugin runner (load #${webviewReloadCounter})`);
		}

		return new PluginRunner(webviewRef);
	}, [webviewReloadCounter]);

	const pluginSettings = usePluginSettings(props.serializedPluginSettings);
	usePlugins(pluginRunner, webviewLoaded, pluginSettings);

	const injectedJs = useMemo(() => {
		return `
			if (!window.loadedBackgroundPage) {
				${shim.injectedJs('pluginBackgroundPage')}
				console.log('Loaded PluginRunnerWebView.');

				// Necessary, because React Native WebView can re-run injectedJs
				// without reloading the page.
				window.loadedBackgroundPage = true;
			}
		`;
	}, []);

	const onError = useCallback((event: any) => {
		logger.error(`Error: (${event.nativeEvent.code}) ${event.nativeEvent.description}`);
	}, []);

	const onLoadStart = useCallback(() => {
		// Handles the case where the webview reloads (e.g. due to an error or performance
		// optimization).
		// Increasing the counter recreates the plugin runner and reloads plugins.
		setWebviewReloadCounter(webviewReloadCounter + 1);
	}, [webviewReloadCounter]);

	const onLoadEnd = useCallback(() => {
		setLoaded(true);
	}, []);


	const renderWebView = () => {
		const hasPlugins = Object.values(pluginSettings).some(setting => setting.enabled);
		if (!hasPlugins) {
			return null;
		}

		return (
			<ExtendedWebView
				style={styles.webview}
				webviewInstanceId='PluginRunner'
				html={html}
				injectedJavaScript={injectedJs}
				onMessage={pluginRunner.onWebviewMessage}
				onError={onError}
				onLoadEnd={onLoadEnd}
				onLoadStart={onLoadStart}
				ref={webviewRef}
			/>
		);
	};
	const accessibilityHidden = true;

	return (
		<>
			<View
				style={styles.containerStyle}

				aria-hidden={accessibilityHidden}
				importantForAccessibility={accessibilityHidden ? 'no-hide-descendants' : undefined}
				accessibilityElementsHidden={accessibilityHidden}
			>
				{renderWebView()}
			</View>
		</>
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
