
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import { useCallback, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { connect, useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { View } from 'react-native';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import PluginDialogManager from './dialogs/PluginDialogManager';
import { AppState } from '../../utils/types';

const logger = Logger.create('PluginRunnerWebView');

const usePluginSettings = (serializedPluginSettings: SerializedPluginSettings) => {
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


interface Props {
	serializedPluginSettings: SerializedPluginSettings;
	pluginStates: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
	themeId: number;
}

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
		// To avoid increasing startup time/memory usage on devices with no plugins, don't
		// load the webview if unnecessary.
		// Note that we intentionally load the webview even if all plugins are disabled.
		const hasPlugins = Object.values(pluginSettings).length > 0;
		if (!hasPlugins) {
			return null;
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

		const injectedJs = `
			if (!window.loadedBackgroundPage) {
				${shim.injectedJs('pluginBackgroundPage')}
				console.log('Loaded PluginRunnerWebView.');

				// Necessary, because React Native WebView can re-run injectedJs
				// without reloading the page.
				window.loadedBackgroundPage = true;
			}
		`;

		return (
			<>
				<ExtendedWebView
					webviewInstanceId='PluginRunner'
					html={html}
					injectedJavaScript={injectedJs}
					hasPluginScripts={true}
					onMessage={pluginRunner.onWebviewMessage}
					onLoadEnd={onLoadEnd}
					onLoadStart={onLoadStart}
					ref={webviewRef}
				/>
				<PluginDialogManager
					themeId={props.themeId}
					pluginHtmlContents={props.pluginHtmlContents}
					pluginStates={props.pluginStates}
				/>
			</>
		);
	};

	return (
		<View style={{ display: 'none' }}>
			{renderWebView()}
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
