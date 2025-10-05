
import { PluginHtmlContents, PluginStates, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import { Button, Portal, SegmentedButtons, Text } from 'react-native-paper';
import useViewInfos from './hooks/useViewInfos';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { connect } from 'react-redux';
import { AppState } from '../../../utils/types';
import PluginUserWebView from './PluginUserWebView';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import DismissibleDialog, { DialogVariant } from '../../../components/DismissibleDialog';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	themeId: number;

	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
	visible: boolean;
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
) => {
	const viewInfoByIdRef = useRef(viewInfoById);
	viewInfoByIdRef.current = viewInfoById;

	const getDefaultSelectedTabId = useCallback((): string|undefined => {
		const lastSelectedId = Setting.value('ui.lastSelectedPluginPanel');
		const lastSelectedInfo = viewInfoByIdRef.current[lastSelectedId];
		if (lastSelectedId && lastSelectedInfo && lastSelectedInfo.view.opened) {
			return lastSelectedId;
		} else {
			return buttonInfos[0]?.value;
		}
	}, [buttonInfos]);

	const [selectedTabId, setSelectedTabId] = useState<string|undefined>(getDefaultSelectedTabId);

	useEffect(() => {
		if (!selectedTabId || !viewInfoById[selectedTabId]?.view?.opened) {
			setSelectedTabId(getDefaultSelectedTabId());
		}
	}, [selectedTabId, viewInfoById, getDefaultSelectedTabId]);

	useEffect(() => {
		if (!selectedTabId) return;

		const info = viewInfoByIdRef.current[selectedTabId];
		Setting.setValue('ui.lastSelectedPluginPanel', selectedTabId);
		AccessibilityInfo.announceForAccessibility(_('%s tab opened', getTabLabel(info)));
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
			.filter(([_id, info]) => info.view.opened)
			.map(([id, info]) => {
				return {
					value: id,
					label: getTabLabel(info),
					icon: 'puzzle',
				};
			});
	}, [viewInfoById]);

	const { selectedTabId, setSelectedTabId } = useSelectedTabId(buttonInfos, viewInfoById);

	const viewInfo = viewInfoById[selectedTabId];

	const renderTabContent = () => {
		if (!viewInfo) {
			return <Text>{_('No tab selected')}</Text>;
		}

		return (
			<View style={styles.webViewContainer} testID='plugin-tab-content'>
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
		void CommandService.instance().execute('dismissPluginPanels');
	}, []);

	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={props.visible}
				size={DialogVariant.Large}
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
	};
})(PluginPanelViewer);
