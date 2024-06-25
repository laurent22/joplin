import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import usePlugin from '@joplin/lib/hooks/usePlugin';
import { DialogContentSize, DialogWebViewApi } from '../types';
import { Button } from 'react-native-paper';
import { themeStyle } from '@joplin/lib/theme';
import { ButtonSpec, DialogResult } from '@joplin/lib/services/plugins/api/types';
import { _ } from '@joplin/lib/locale';
import WebviewController, { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { Theme } from '@joplin/lib/themes/type';
import useDialogSize from './hooks/useDialogSize';
import PluginUserWebView from './PluginUserWebView';

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
		const dialogHasLoaded = !!dialogContentSize;

		const maxWidth = windowSize.width * 0.97;
		const maxHeight = windowSize.height * 0.95;
		const dialogWidth = useDialogSize ? dialogContentSize.width : maxWidth;
		const dialogHeight = useDialogSize ? dialogContentSize.height : maxHeight;

		return StyleSheet.create({
			webView: {
				backgroundColor: 'transparent',
				display: 'flex',
			},
			webViewContainer: {
				flexGrow: 1,
				flexShrink: 1,

				maxWidth,
				maxHeight,
				width: dialogWidth,
				height: dialogHeight,
			},
			dialog: {
				backgroundColor: theme.backgroundColor,
				borderRadius: 12,

				maxWidth,
				maxHeight,
				opacity: dialogHasLoaded ? 1 : 0.1,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',
			},
			buttonRow: {
				flexDirection: 'row',
				flexShrink: 0,
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
	const [dialogControl, setDialogControl] = useState<DialogWebViewApi|null>(null);

	const dialogSize = useDialogSize({
		dialogControl,
		webViewLoadCount,
		watchForSizeChanges: view.fitToContent,
	});
	const styles = useStyles(props.themeId, dialogSize, view.fitToContent);

	const onButtonPress = useCallback(async (button: ButtonSpec) => {
		const closeWithResponse = (response?: DialogResult|null) => {
			const viewController = plugin.viewController(viewId) as WebviewController;
			if (view.containerType === ContainerType.Dialog) {
				viewController.closeWithResponse(response);
			} else {
				viewController.close();
			}
		};

		let formData = undefined;
		if (button.id !== 'cancel') {
			formData = await dialogControl.getFormData();
		}

		closeWithResponse({ id: button.id, formData });
		button.onClick?.();
	}, [dialogControl, plugin, viewId, view.containerType]);

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
	}, [setWebViewLoadCount, webViewLoadCount]);

	return (
		<View style={styles.dialog}>
			<View style={styles.webViewContainer}>
				<PluginUserWebView
					style={styles.webView}
					themeId={props.themeId}
					viewInfo={props.viewInfo}
					pluginHtmlContents={props.pluginHtmlContents}
					onLoadEnd={onWebViewLoaded}
					setDialogControl={setDialogControl}
				/>
			</View>
			<View style={styles.buttonRow}>
				{buttonComponents}
			</View>
		</View>
	);
};

export default PluginDialogWebView;
