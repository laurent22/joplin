
import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import { useCallback, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import PluginRunner from './PluginRunner';
import loadPlugins from '../loadPlugins';
import { connect, useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { View, ViewStyle } from 'react-native';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { AppState } from '../../utils/types';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import PluginDialogManager from './dialogs/PluginDialogManager';

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

const usePlugins = (pluginRunner: PluginRunner, webviewLoaded: boolean, serializedPluginSettings: string) => {
	const store = useStore();

	useAsyncEffect(async (event) => {
		if (!webviewLoaded) {
			return;
		}

		const pluginService = PluginService.instance();
		const pluginSettings = pluginService.unserializePluginSettings(serializedPluginSettings);

		void loadPlugins(pluginRunner, pluginSettings, store, event);
	}, [pluginRunner, store, webviewLoaded, serializedPluginSettings]);
};

const PluginRunnerWebViewComponent: React.FC<Props> = props => {
	const webviewRef = useRef<WebViewControl>();

	const pluginRunner = useMemo(() => {
		return new PluginRunner(webviewRef);
	}, []);
	const [webviewLoaded, setLoaded] = useState(false);

	usePlugins(pluginRunner, webviewLoaded, props.serializedPluginSettings);

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
			console.log('Loaded PluginRunnerWebView.');
		`;
	}, []);

	const onError = useCallback((event: any) => {
		logger.error(`Error: (${event.nativeEvent.code}) ${event.nativeEvent.description}`);
	}, []);

	const webView = (
		<ExtendedWebView
			style={styles.webview}
			themeId={props.themeId}
			webviewInstanceId='PluginRunner'
			html={html}
			injectedJavaScript={injectedJs}
			onMessage={pluginRunner.onWebviewMessage}
			onError={onError}
			onLoadEnd={() => setLoaded(true)}
			ref={webviewRef}
		/>
	);

	const accessibilityHidden = true;

	return (
		<>
			<View
				style={styles.containerStyle}

				aria-hidden={accessibilityHidden}
				importantForAccessibility={accessibilityHidden ? 'no-hide-descendants' : undefined}
				accessibilityElementsHidden={accessibilityHidden}
			>
				{webView}
			</View>
			<PluginDialogManager
				themeId={props.themeId}
				pluginHtmlContents={props.pluginHtmlContents}
				pluginStates={props.pluginStates}
			/>
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
