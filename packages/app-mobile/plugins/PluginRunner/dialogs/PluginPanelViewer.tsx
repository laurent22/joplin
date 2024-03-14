
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import { Button, IconButton, Modal, Portal, SegmentedButtons, Text } from 'react-native-paper';
import useViewInfos from './hooks/useViewInfos';
import WebviewController, { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { connect } from 'react-redux';
import { AppState } from '../../../utils/types';
import PluginUserWebView from './PluginUserWebView';
import { View, useWindowDimensions, StyleSheet, AccessibilityInfo } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { Theme } from '@joplin/lib/themes/type';
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { Dispatch } from 'redux';

interface Props {
	themeId: number;

	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
	visible: boolean;
	dispatch: Dispatch;
}


const useStyles = (themeId: number) => {
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
				flexShrink: 1,
			},
			closeButtonContainer: {
				flexDirection: 'row',
				justifyContent: 'flex-end',
			},
			dialog: {
				backgroundColor: theme.backgroundColor,
				borderRadius: 12,
				padding: 10,

				height: windowSize.height * 0.9,
				width: windowSize.width * 0.97,

				// Center
				marginLeft: 'auto',
				marginRight: 'auto',
			},
		});
	}, [themeId, windowSize.width, windowSize.height]);
};

const emptyCallback = () => {};

const getTabLabel = (info: ViewInfo) => {
	return PluginService.instance().pluginById(info.plugin.id).manifest.name;
};
const PluginPanelViewer: React.FC<Props> = props => {
	const viewInfos = useViewInfos(props.pluginStates);
	const viewInfoById = useMemo(() => {
		const result: Record<string, ViewInfo> = {};
		for (const info of viewInfos) {
			result[`${info.plugin.id}--${info.view.id}`] = info;
		}
		return result;
	}, [viewInfos]);

	const buttonInfos = useMemo(() => {
		return Object.entries(viewInfoById)
			.filter(([_id, info]) => info.view.containerType === ContainerType.Panel)
			.map(([id, info]) => {
				return {
					value: id,
					label: getTabLabel(info),
					icon: 'puzzle',
				};
			});
	}, [viewInfoById]);

	const [selectedTabId, setSelectedTabId] = useState(() => {
		const lastSelectedId = Setting.value('ui.lastSelectedPluginPanel');
		if (lastSelectedId && viewInfoById[lastSelectedId]) {
			return lastSelectedId;
		} else {
			return buttonInfos[0]?.value;
		}
	});

	useEffect(() => {
		if (!selectedTabId) return () => {};

		const info = viewInfoById[selectedTabId];
		const plugin = PluginService.instance().pluginById(info.plugin.id);
		const controller = plugin.viewController(info.view.id) as WebviewController;
		controller.setIsShownInModal(true);
		Setting.setValue('ui.lastSelectedPluginPanel', selectedTabId);

		AccessibilityInfo.announceForAccessibility(_('%s tab opened', getTabLabel(info)));

		return () => {
			controller.setIsShownInModal(false);
		};
	}, [viewInfoById, selectedTabId]);


	const styles = useStyles(props.themeId);

	const viewInfo = viewInfoById[selectedTabId];

	const renderTabContent = () => {
		if (!viewInfo) {
			return <Text>{_('No tab selected')}</Text>;
		}

		return (
			<View style={styles.webViewContainer}>
				<PluginUserWebView
					key={selectedTabId}
					themeId={props.themeId}
					style={styles.webView}
					viewInfo={viewInfo}
					pluginHtmlContents={props.pluginHtmlContents}
					onLoadEnd={emptyCallback}
					setDialogControl={emptyCallback}
				/>
			</View>
		);
	};

	const renderTabSelector = () => {
		// SegmentedButtons doesn't display correctly when there's only one button.
		// As such, we include a special case:
		if (buttonInfos.length === 1) {
			const buttonInfo = buttonInfos[0];
			return <Button icon={buttonInfo.icon}>{buttonInfo.label}</Button>;
		}

		return (
			<SegmentedButtons
				value={selectedTabId}
				onValueChange={setSelectedTabId}
				buttons={buttonInfos}
			/>
		);
	};

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'TOGGLE_PLUGIN_PANELS_DIALOG',
		});
	}, [props.dispatch]);

	const closeButton = (
		<View style={styles.closeButtonContainer}>
			<IconButton
				icon='close'
				accessibilityLabel={_('Close')}
				onPress={onClose}
			/>
		</View>
	);

	return (
		<Portal>
			<Modal
				visible={props.visible}
				onDismiss={onClose}
				contentContainerStyle={styles.dialog}
			>
				{closeButton}
				{renderTabContent()}
				{renderTabSelector()}
			</Modal>
		</Portal>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		visible: state.showPanelsDialog,
		pluginStates: state.pluginService.plugins,
	};
})(PluginPanelViewer);
