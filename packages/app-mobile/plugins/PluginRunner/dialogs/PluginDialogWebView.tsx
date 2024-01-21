import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import ExtendedWebView, { WebViewControl } from '../../../components/ExtendedWebView';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import usePlugin from '../../hooks/usePlugin';
import { DialogContentSize, DialogMainProcessApi, DialogWebViewApi } from '../types';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import RNToWebViewMessenger from '../../../utils/ipc/RNToWebViewMessenger';
import Logger from '@joplin/utils/Logger';
import createOnLogHander from '../utils/createOnLogHandler';
import shim from '@joplin/lib/shim';
import { Button, Modal, Portal } from 'react-native-paper';
import themeToCss from '@joplin/lib/services/style/themeToCss';
import { themeStyle } from '@joplin/lib/theme';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { _ } from '@joplin/lib/locale';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';
import { Theme } from '@joplin/lib/themes/type';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

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

		return StyleSheet.create({
			webView: {
				backgroundColor: 'transparent',
				display: 'flex',
			},
			webViewContainer: {
				flexGrow: 1,
			},
			dialog: {
				backgroundColor: theme.backgroundColor,
				marginLeft: 'auto',
				marginRight: 'auto',
				flexGrow: fitToContent ? 0 : 1,
				borderRadius: 12,

				maxWidth: windowSize.width,
				minWidth: !dialogContentSize ? windowSize.width : windowSize.width / 2,
				width: dialogContentSize ? dialogContentSize.width : undefined,
				maxHeight: windowSize.height * 0.95,
			},
			buttonRow: {
				flexDirection: 'row',
				padding: 12,
				justifyContent: 'flex-end',
			},
		});
	}, [themeId, fitToContent, dialogContentSize, windowSize]);
};

const messageChannelId = 'dialog-messenger';

const defaultButtonSpecs: ButtonSpec[] = [
	{ id: 'ok' }, { id: 'cancel' },
];

const PluginDialogWebView: React.FC<Props> = props => {
	const viewInfo = props.viewInfo;
	const view = viewInfo.view;
	const pluginId = viewInfo.plugin.id;
	const viewId = view.id;
	const plugin = usePlugin(pluginId);

	const viewController = useMemo(() => {
		return plugin.viewController(viewId) as WebviewController;
	}, [plugin, viewId]);

	const logger = useMemo(() => Logger.create(`PluginDialogWebView(${pluginId})`), [pluginId]);

	const webviewRef = useRef<WebViewControl>(null);
	const submittedRef = useRef<boolean>(false);

	const onDismiss = useCallback(() => {
		if (!submittedRef.current) {
			viewController.closeWithResponse(null);
			submittedRef.current = true;
		}
	}, [viewController]);

	const messenger = useMemo(() => {
		const dialogApi: DialogMainProcessApi = {
			postMessage: async (message: SerializableData) => {
				return await viewController.emitMessage({ message });
			},

			onMessage: async (callback) => {
				viewController.onMessage(callback);
			},
			onSubmit: async (buttonId: string, formData: any) => {
				if (buttonId === 'cancel') {
					formData = undefined;
				}
				viewController.closeWithResponse({ id: buttonId, formData });
				submittedRef.current = true;
			},
			onDismiss: async () => {
				onDismiss();
			},
			onError: async (error: string) => {
				logger.error(`Unhandled error: ${error}`);
				plugin.hasErrors = true;
			},
			onLog: createOnLogHander(plugin, logger),
		};

		return new RNToWebViewMessenger<DialogMainProcessApi, DialogWebViewApi>(
			messageChannelId, webviewRef, dialogApi,
		);
	}, [plugin, viewController, onDismiss, logger]);

	useEffect(() => {
		const scriptPaths = props.viewInfo.view.scripts ?? [];
		const jsPaths = [];
		const cssPaths = [];
		for (const rawPath of scriptPaths) {
			const resolvedPath = shim.fsDriver().resolveRelativePathWithinDir(plugin.baseDir, rawPath);

			if (resolvedPath.match(/\.css$/i)) {
				cssPaths.push(resolvedPath);
			} else {
				jsPaths.push(resolvedPath);
			}
		}
		void messenger.remoteApi.includeCssFiles(cssPaths);
		void messenger.remoteApi.includeJsFiles(jsPaths);
	}, [props.viewInfo, messenger, plugin]);

	useEffect(() => {
		const theme = themeStyle(props.themeId);
		const themeVariableCss = themeToCss(theme);
		void messenger.remoteApi.setThemeCss(themeVariableCss);
	}, [messenger, props.themeId]);

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

	const [dialogSize, setDialogSize] = useState<DialogContentSize|null>(null);
	useAsyncEffect(async () => {
		const contentSize = await messenger.remoteApi.getContentSize();
		setDialogSize(contentSize);
	}, [messenger]);

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

	return (
		<Portal>
			<Modal
				dismissable={true}
				onDismiss={onDismiss}
				visible={true}
				contentContainerStyle={styles.dialog}
			>
				<View style={styles.webViewContainer}>
					<ExtendedWebView
						style={styles.webView}
						themeId={props.themeId}
						baseUrl={plugin.baseDir}
						webviewInstanceId='joplin__PluginDialogWebView'
						html={html}
						injectedJavaScript={injectedJs}
						onMessage={messenger.onWebViewMessage}
						onError={event => console.error(event.nativeEvent)}
						onLoadEnd={messenger.onWebViewLoaded}
						ref={webviewRef}
					/>
				</View>
				<View style={styles.buttonRow}>
					{buttonComponents}
				</View>
			</Modal>
		</Portal>
	);
};

export default PluginDialogWebView;
