import * as React from 'react';
import ExtendedWebView, { WebViewControl } from '../../components/ExtendedWebView';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';
import PluginRunner from './PluginRunner';
import loadPlugins from '@joplin/lib/services/plugins/loadPlugins';
import { connect, useStore } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { View } from 'react-native';
import PluginService, { PluginSettings, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginHtmlContents, PluginStates } from '@joplin/lib/services/plugins/reducer';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import PluginDialogManager from './dialogs/PluginDialogManager';
import { AppState } from '../../utils/types';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import PlatformImplementation from '../../services/plugins/PlatformImplementation';
import { Stat } from '@joplin/lib/fs-driver-base';

const logger = Logger.create('PluginRunnerWebView');

const usePluginSettings = (serializedPluginSettings: SerializedPluginSettings) => {
	return useMemo(() => {
		const pluginService = PluginService.instance();
		return pluginService.unserializePluginSettings(serializedPluginSettings);
	}, [serializedPluginSettings]);
};

const useReloadDevPluginCounter = (webviewLoaded: boolean, devPluginPaths: string) => {
	const [reloadDevPluginCounter, setReloadDevPluginCounter] = useState(0);
	const lastDevPluginStats = useRef<Map<string, Stat>>();
	if (!lastDevPluginStats.current) {
		lastDevPluginStats.current = new Map<string, Stat>();
	}

	useEffect(() => {
		if (!devPluginPaths.trim() || !webviewLoaded) return ()=>{};

		// Poll for changes
		const interval = shim.setInterval(async () => {
			const paths = devPluginPaths.split(',');
			for (const path of paths) {
				if (!await shim.fsDriver().exists(path)) continue;

				const stats = await shim.fsDriver().readDirStats(path);
				if (stats) {
					for (const stat of stats) {
						const fullPath = `${path}/${stat.path}`;
						if (fullPath.endsWith('.js') || fullPath.endsWith('.jpl')) {
							const lastStat = lastDevPluginStats.current.get(fullPath);
							lastDevPluginStats.current.set(fullPath, stat);

							if (!lastStat || lastStat.mtime < stat.mtime) {
								logger.info('Preparing to reload dev plugin at path', fullPath);
								setReloadDevPluginCounter(counter => counter + 1);
								break;
							}
						}
					}
				}
			}
		}, 5_000);

		return () => {
			shim.clearInterval(interval);
		};
	}, [devPluginPaths, webviewLoaded]);

	return reloadDevPluginCounter;
};

const usePlugins = (
	pluginRunner: PluginRunner,
	webviewLoaded: boolean,
	pluginSettings: PluginSettings,
	devPluginPaths: string,
) => {
	const store = useStore<AppState>();
	const lastPluginRunner = usePrevious(pluginRunner);

	// Only set reloadAll to true here -- this ensures that all plugins are reloaded,
	// even if loadPlugins is cancelled and re-run.
	const reloadAllRef = useRef(false);
	reloadAllRef.current ||= pluginRunner !== lastPluginRunner;

	const reloadDevPluginCounter = useReloadDevPluginCounter(webviewLoaded, devPluginPaths);

	useAsyncEffect(async (event) => {
		if (!webviewLoaded) {
			return;
		}

		await loadPlugins({
			pluginRunner,
			pluginSettings,
			platformImplementation: PlatformImplementation.instance(),
			store,
			reloadAll: reloadAllRef.current,
			cancelEvent: event,
		});

		// A full reload, if it was necessary, has been completed.
		if (!event.cancelled) {
			reloadAllRef.current = false;
		}
	}, [pluginRunner, store, webviewLoaded, pluginSettings, reloadDevPluginCounter]);
};

const useUnloadPluginsOnGlobalDisable = (
	pluginStates: PluginStates,
	pluginSupportEnabled: boolean,
) => {
	const pluginStatesRef = useRef(pluginStates);
	pluginStatesRef.current = pluginStates;
	useAsyncEffect(async event => {
		if (!pluginSupportEnabled && Object.keys(pluginStatesRef.current).length) {
			for (const pluginId in pluginStatesRef.current) {
				await PluginService.instance().unloadPlugin(pluginId);
				if (event.cancelled) return;
			}
		}
	}, [pluginSupportEnabled]);
};

interface Props {
	serializedPluginSettings: SerializedPluginSettings;
	pluginSupportEnabled: boolean;
	pluginStates: PluginStates;
	devPluginPaths: string;
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
	usePlugins(pluginRunner, webviewLoaded, pluginSettings, props.devPluginPaths);
	useUnloadPluginsOnGlobalDisable(props.pluginStates, props.pluginSupportEnabled);

	const onLoadStart = useCallback(() => {
		// Handles the case where the webview reloads (e.g. due to an error or performance
		// optimization).
		// Increasing the counter recreates the plugin runner and reloads plugins.
		setWebviewReloadCounter(webviewReloadCounter + 1);
	}, [webviewReloadCounter]);

	const onLoadEnd = useCallback(() => {
		setLoaded(true);
	}, []);


	// To avoid increasing startup time/memory usage on devices with no plugins, don't
	// load the webview if unnecessary.
	// Note that we intentionally load the webview even if all plugins are disabled, as
	// this allows any plugins we don't have settings for to run.
	const loadWebView = props.pluginSupportEnabled;
	useEffect(() => {
		if (!loadWebView) {
			setLoaded(false);
		}
	}, [loadWebView]);

	const renderWebView = () => {
		if (!loadWebView) {
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
					webviewInstanceId='PluginRunner2'
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
		pluginSupportEnabled: state.settings['plugins.pluginSupportEnabled'],
		pluginStates: state.pluginService.plugins,
		devPluginPaths: state.settings['plugins.devPluginPaths'],
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		themeId: state.settings.theme,
	};
	return result;
})(PluginRunnerWebViewComponent);
