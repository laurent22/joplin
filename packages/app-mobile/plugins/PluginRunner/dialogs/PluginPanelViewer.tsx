
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import { Button, Portal, SegmentedButtons, Text } from 'react-native-paper';
import useViewInfos from './hooks/useViewInfos';
import WebviewController, { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { connect } from 'react-redux';
import { AppState, OpenPluginPanels } from '../../../utils/types';
import PluginUserWebView from './PluginUserWebView';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import { Dispatch } from 'redux';
import DismissibleDialog from '../../../components/DismissibleDialog';

interface Props {
	themeId: number;

	openedPanels: OpenPluginPanels;
	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
	visible: boolean;
	dispatch: Dispatch;
}


const styles = StyleSheet.create({
	webView: {
		backgroundColor: 'transparent',
		display: 'flex',
	},
	webViewContainer: {
		flexGrow: 1,
		flexShrink: 1,
	},
});

type ButtonInfo = {
	value: string;
	label: string;
	icon: string;
};

const useSelectedTabId = (
	buttonInfos: ButtonInfo[],
	viewInfoById: Record<string, ViewInfo>,
	visiblePanels: OpenPluginPanels,
) => {
	const viewInfoByIdRef = useRef(viewInfoById);
	viewInfoByIdRef.current = viewInfoById;
	const visiblePanelsRef = useRef(visiblePanels);
	visiblePanelsRef.current = visiblePanels;

	const getDefaultSelectedTabId = useCallback((): string|undefined => {
		const lastSelectedId = Setting.value('ui.lastSelectedPluginPanel');
		if (lastSelectedId && viewInfoByIdRef.current[lastSelectedId] && visiblePanels[lastSelectedId]) {
			return lastSelectedId;
		} else {
			return buttonInfos[0]?.value;
		}
	}, [buttonInfos, visiblePanels]);

	const [selectedTabId, setSelectedTabId] = useState<string|undefined>(getDefaultSelectedTabId);

	useEffect(() => {
		if (!selectedTabId || !visiblePanels[selectedTabId]) {
			setSelectedTabId(getDefaultSelectedTabId());
		}
	}, [selectedTabId, visiblePanels, getDefaultSelectedTabId]);

	useEffect(() => {
		if (!selectedTabId) return () => {};

		const info = viewInfoByIdRef.current[selectedTabId];

		let controller: WebviewController|null = null;
		if (info && visiblePanelsRef.current[info.view.id]) {
			const plugin = PluginService.instance().pluginById(info.plugin.id);
			controller = plugin.viewController(info.view.id) as WebviewController;
			controller.setIsShownInModal(true);
		}

		Setting.setValue('ui.lastSelectedPluginPanel', selectedTabId);
		AccessibilityInfo.announceForAccessibility(_('%s tab opened', getTabLabel(info)));

		return () => {
			controller?.setIsShownInModal(false);
		};
	}, [selectedTabId]);

	return { setSelectedTabId, selectedTabId };
};

const emptyCallback = () => {};

const getTabLabel = (info: ViewInfo) => {
	// Handles the case where a plugin just unloaded or hasn't loaded yet.
	if (!info) {
		return '...';
	}

	return PluginService.instance().pluginById(info.plugin.id).manifest.name;
};
const PluginPanelViewer: React.FC<Props> = props => {
	const viewInfos = useViewInfos(props.pluginStates);
	const viewInfoById = useMemo(() => {
		const result: Record<string, ViewInfo> = {};
		for (const info of viewInfos) {
			result[info.view.id] = info;
		}
		return result;
	}, [viewInfos]);

	const buttonInfos = useMemo(() => {
		return Object.entries(viewInfoById)
			.filter(([_id, info]) => info.view.containerType === ContainerType.Panel)
			.filter(([_id, info]) => props.openedPanels[info.view.id])
			.map(([id, info]) => {
				return {
					value: id,
					label: getTabLabel(info),
					icon: 'puzzle',
				};
			});
	}, [viewInfoById, props.openedPanels]);

	const { selectedTabId, setSelectedTabId } = useSelectedTabId(buttonInfos, viewInfoById, props.openedPanels);

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
			return (
				<Button icon={buttonInfo.icon} onPress={()=>setSelectedTabId(buttonInfo.value)}>
					{buttonInfo.label}
				</Button>
			);
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
			type: 'SET_PLUGIN_PANELS_DIALOG_VISIBLE',
			visible: false,
		});
	}, [props.dispatch]);

	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={props.visible}
				onDismiss={onClose}
			>
				{renderTabContent()}
				{renderTabSelector()}
			</DismissibleDialog>
		</Portal>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		visible: state.showPanelsDialog,
		pluginStates: state.pluginService.plugins,
		openedPanels: state.openPluginPanels,
	};
})(PluginPanelViewer);
