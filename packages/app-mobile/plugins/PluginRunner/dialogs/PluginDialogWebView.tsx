import * as React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import ExtendedWebView, { WebViewControl } from '../../../components/ExtendedWebView';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import usePlugin from '../../hooks/usePlugin';
import { DialogContentSize } from '../types';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import { Button } from 'react-native-paper';
import { themeStyle } from '@joplin/lib/theme';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { _ } from '@joplin/lib/locale';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';
import { Theme } from '@joplin/lib/themes/type';
import useDialogMessenger, { messageChannelId } from './hooks/useDialogMessenger';
import useWebViewSetup from './hooks/useWebViewSetup';
import useDialogSize from './hooks/useDialogSize';

interface Props {
	themeId: number;
	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
	viewInfo: ViewInfo;
}

const useStyles = (
	themeId: number,
	dialogContentSize: DialogContentSize|null,
	fitToContent: boolean,
) => {
	const windowSize = useWindowDimensions();

	return useMemo(() => {
		const theme: Theme = themeStyle(themeId);

		const useDialogSize = fitToContent && dialogContentSize;

		return StyleSheet.create({
			webView: {
				backgroundColor: 'transparent',
				display: 'flex',
			},
			webViewContainer: {
				flexGrow: 1,
				flexShrink: 1,
			},
			dialog: {
				backgroundColor: theme.backgroundColor,
				borderRadius: 12,

				maxHeight: useDialogSize ? dialogContentSize?.height : undefined,
				maxWidth: useDialogSize ? dialogContentSize?.width : undefined,
				height: windowSize.height * 0.95,
				width: windowSize.width * 0.95,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',
			},
			buttonRow: {
				flexDirection: 'row',
				padding: 12,
				justifyContent: 'flex-end',
			},
		});
	}, [themeId, dialogContentSize, fitToContent, windowSize.width, windowSize.height]);
};

const defaultButtonSpecs: ButtonSpec[] = [
	{ id: 'ok' }, { id: 'cancel' },
];

const PluginDialogWebView: React.FC<Props> = props => {
	const viewInfo = props.viewInfo;
	const view = viewInfo.view;
	const pluginId = viewInfo.plugin.id;
	const viewId = view.id;
	const plugin = usePlugin(pluginId);
	const [webViewLoadCount, setWebViewLoadCount] = useState(0);

	const viewController = useMemo(() => {
		return plugin.viewController(viewId) as WebviewController;
	}, [plugin, viewId]);

	const logger = useMemo(() => Logger.create(`PluginDialogWebView(${pluginId})`), [pluginId]);
	const webviewRef = useRef<WebViewControl>(null);

	const messenger = useDialogMessenger({
		plugin,
		pluginLogger: logger,
		viewController,
		webviewRef,
	});

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

	const dialogSize = useDialogSize({
		dialogControl: messenger.remoteApi,
		webViewLoadCount,
	});
	const styles = useStyles(props.themeId, dialogSize, view.fitToContent);

	const onButtonPress = useCallback(async (button: ButtonSpec) => {
		let formData = undefined;
		if (button.id !== 'cancel') {
			formData = await messenger.remoteApi.getFormData();
		}

		viewController.closeWithResponse({ id: button.id, formData });

		button.onClick?.();
	}, [viewController, messenger]);

	const buttonComponents: React.ReactElement[] = [];
	const buttonSpecs = view.buttons ?? defaultButtonSpecs;
	for (const button of buttonSpecs) {
		let iconName = undefined;
		let buttonTitle = button.title ?? button.id;

		if (button.id === 'cancel') {
			iconName = 'close-outline';
			buttonTitle = button.title ?? _('Cancel');
		} else if (button.id === 'ok') {
			iconName = 'check';
			buttonTitle = button.title ?? _('OK');
		}

		buttonComponents.push(
			<Button
				key={button.id}
				icon={iconName}
				mode='text'
				onPress={() => onButtonPress(button)}
			>
				{buttonTitle}
			</Button>,
		);
	}

	const onWebViewLoaded = useCallback(() => {
		setWebViewLoadCount(webViewLoadCount + 1);
		messenger.onWebViewLoaded();
	}, [messenger, setWebViewLoadCount, webViewLoadCount]);

	return (
		<View style={styles.dialog}>
			<View style={styles.webViewContainer}>
				<ExtendedWebView
					style={styles.webView}
					themeId={props.themeId}
					baseUrl={plugin.baseDir}
					webviewInstanceId='joplin__PluginDialogWebView'
					html={html}
					injectedJavaScript={injectedJs}
					onMessage={messenger.onWebViewMessage}
					onLoadEnd={onWebViewLoaded}
					ref={webviewRef}
				/>
			</View>
			<View style={styles.buttonRow}>
				{buttonComponents}
			</View>
		</View>
	);
};

export default PluginDialogWebView;
