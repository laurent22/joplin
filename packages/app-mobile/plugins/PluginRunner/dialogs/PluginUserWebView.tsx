import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PluginHtmlContents, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import ExtendedWebView, { WebViewControl } from '../../../components/ExtendedWebView';
import { ViewStyle } from 'react-native';
import usePlugin from '../../hooks/usePlugin';
import shim from '@joplin/lib/shim';
import useDialogMessenger, { messageChannelId } from './hooks/useDialogMessenger';
import useWebViewSetup from './hooks/useWebViewSetup';
import { DialogWebViewApi } from '../types';

interface Props {
	themeId: number;
	pluginHtmlContents: PluginHtmlContents;
	viewInfo: ViewInfo;
	style: ViewStyle;
	onLoadEnd: ()=> void;
	setDialogControl: (dialogControl: DialogWebViewApi)=> void;
}

const PluginUserWebView = (props: Props) => {
	const viewInfo = props.viewInfo;
	const view = viewInfo.view;
	const pluginId = viewInfo.plugin.id;
	const viewId = view.id;
	const plugin = usePlugin(pluginId);
	const [webViewLoadCount, setWebViewLoadCount] = useState(0);

	const webviewRef = useRef<WebViewControl>(null);

	const messenger = useDialogMessenger({
		pluginId,
		viewId,
		webviewRef,
	});

	useEffect(() => {
		// Because of how messenger.remoteApi handles message forwarding (property names
		// are not known), we need to send methods individually and can't use an object
		// spread or send messenger.remoteApi.
		props.setDialogControl({
			includeCssFiles: messenger.remoteApi.includeCssFiles,
			includeJsFiles: messenger.remoteApi.includeJsFiles,
			setThemeCss: messenger.remoteApi.setThemeCss,
			getFormData: messenger.remoteApi.getFormData,
			getContentSize: messenger.remoteApi.getContentSize,
		});
	}, [messenger, props.setDialogControl]);

	useWebViewSetup({
		themeId: props.themeId,
		dialogControl: messenger.remoteApi,
		scriptPaths: view.scripts ?? [],
		pluginBaseDir: plugin.baseDir,
		webViewLoadCount,
	});

	const htmlContent = props.pluginHtmlContents[pluginId]?.[viewId] ?? '';
	const html = `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8"/>
				<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
				<title>Plugin Dialog</title>
				<style>
					body {
						padding: 20px;
					}
				</style>
			</head>
			<body>
				${htmlContent}
			</body>
		</html>
	`;

	const injectedJs = useMemo(() => {
		return `
			${shim.injectedJs('pluginBackgroundPage')}
			pluginBackgroundPage.initializeDialogWebView(
				${JSON.stringify(messageChannelId)}
			);
		`;
	}, []);

	const onWebViewLoaded = useCallback(() => {
		setWebViewLoadCount(webViewLoadCount + 1);
		props.onLoadEnd();
		messenger.onWebViewLoaded();
	}, [messenger, setWebViewLoadCount, webViewLoadCount, props.onLoadEnd]);

	return (
		<ExtendedWebView
			style={props.style}
			themeId={props.themeId}
			baseUrl={plugin.baseDir}
			webviewInstanceId='joplin__PluginDialogWebView'
			html={html}
			injectedJavaScript={injectedJs}
			onMessage={messenger.onWebViewMessage}
			onLoadEnd={onWebViewLoaded}
			ref={webviewRef}
		/>
	);
};

export default PluginUserWebView;
