
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
import { View, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import { _ } from '@joplin/lib/locale';
import DismissibleDialog, { DialogVariant } from '../../../components/DismissibleDialog';
import CommandService from '@joplin/lib/services/CommandService';
import { getSelectedTabScrollOffset, getTabLayout } from './pluginPanelTabLayout';
import useSelectedTabId from './hooks/useSelectedTabId';

interface Props {
	themeId: number;

	pluginHtmlContents: PluginHtmlContents;
	pluginStates: PluginStates;
	visible: boolean;
	inert?: boolean;
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
	tabSelector: {
		flexGrow: 0,
	},
	tabSelectorContent: {
		flexGrow: 1,
	},
	tabSelectorButtons: {
		flexGrow: 1,
		flexShrink: 0,
	},
	hiddenTabSelector: {
		opacity: 0,
	},
	uncappedTab: {
		flexBasis: 'auto',
		flexShrink: 0,
	},
	truncatedTabLabel: {
		flexShrink: 1,
	},
});

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
				const label = getTabLabel(info);
				return {
					value: id,
					label,
					accessibilityLabel: label,
					icon: 'puzzle',
				};
			});
	}, [viewInfoById]);
	const { selectedTabId, setSelectedTabId } = useSelectedTabId(buttonInfos);
	const selectorKey = JSON.stringify(buttonInfos.map(info => [info.value, info.label]));
	const [selectorWidth, setSelectorWidth] = useState(0);
	const [naturalMeasurement, setNaturalMeasurement] = useState<{ key: string; selectorWidth: number; contentWidth: number }|null>(null);
	const [positionedKey, setPositionedKey] = useState<string|null>(null);
	const selectorRef = useRef<ScrollView>(null);
	const scrollOffsetRef = useRef(0);
	const measurementReady = naturalMeasurement?.key === selectorKey && naturalMeasurement.selectorWidth === selectorWidth && selectorWidth > 0;
	const tabLayout = getTabLayout(measurementReady ? naturalMeasurement.contentWidth : 0, selectorWidth, buttonInfos.length);
	const layoutKey = `${selectorKey}:${selectorWidth}`;

	const onSelectorLayout = useCallback((event: LayoutChangeEvent) => {
		setSelectorWidth(event.nativeEvent.layout.width);
	}, []);
	const onContentSizeChange = useCallback((width: number) => {
		if (!selectorWidth) return;
		if (!measurementReady) {
			setNaturalMeasurement({ key: selectorKey, selectorWidth, contentWidth: width });
		}
	}, [selectorWidth, measurementReady, selectorKey]);
	const onSelectorScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
		scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
	}, []);

	useEffect(() => {
		scrollOffsetRef.current = 0;
		setPositionedKey(null);
	}, [selectorKey]);

	useEffect(() => {
		if (!props.visible) {
			scrollOffsetRef.current = 0;
			setPositionedKey(null);
			return undefined;
		}
		if (!measurementReady || !selectedTabId) return undefined;

		const frame = requestAnimationFrame(() => {
			const selectedIndex = buttonInfos.findIndex(info => info.value === selectedTabId);
			if (selectedIndex < 0) return;

			const target = tabLayout.overflow ? getSelectedTabScrollOffset(tabLayout.tabWidth, buttonInfos.length, selectedIndex, selectorWidth, scrollOffsetRef.current) : 0;
			selectorRef.current?.scrollTo({ x: target, animated: false });
			setPositionedKey(layoutKey);
		});
		return () => cancelAnimationFrame(frame);
	}, [props.visible, measurementReady, selectedTabId, buttonInfos, tabLayout.overflow, tabLayout.tabWidth, selectorWidth, layoutKey]);

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
			<ScrollView
				key={layoutKey}
				ref={selectorRef}
				horizontal={true}
				style={[styles.tabSelector, (!measurementReady || positionedKey !== layoutKey) && styles.hiddenTabSelector]}
				contentContainerStyle={styles.tabSelectorContent}
				onLayout={onSelectorLayout}
				onContentSizeChange={onContentSizeChange}
				onScroll={onSelectorScroll}
				scrollEventThrottle={16}
			>
				<SegmentedButtons
					style={styles.tabSelectorButtons}
					value={selectedTabId}
					onValueChange={setSelectedTabId}
					buttons={buttonInfos.map(info => ({
						...info,
						style: tabLayout.overflow ? { ...styles.uncappedTab, flexGrow: 0, width: tabLayout.tabWidth } : styles.uncappedTab,
						labelStyle: styles.truncatedTabLabel,
					}))}
				/>
			</ScrollView>
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
				useNativeModal={false}
				inert={props.inert}
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
