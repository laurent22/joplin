import * as React from 'react';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { ToolbarButtonInfo, ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import toolbarButtonsFromState from './utils/toolbarButtonsFromState';
import { useCallback, useMemo, useRef, useState } from 'react';
import { themeStyle } from '../global-style';
import ToolbarEditorDialog from './ToolbarEditorDialog';
import { EditorState } from './types';
import ToolbarButton from './ToolbarButton';
import isSelected from './utils/isSelected';
import { _ } from '@joplin/lib/locale';
import useButtonSize from './utils/useButtonSize';

interface Props {
	themeId: number;
	toolbarButtonInfos: ToolbarItem[];
	editorState: EditorState;
}

const useButtonPadding = (buttonCount: number) => {
	const { buttonSize } = useButtonSize();
	const [containerWidth, setContainerWidth] = useState(0);

	const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
		setContainerWidth(event.nativeEvent.layout.width);
	}, []);

	const buttonPadding = useMemo(() => {
		if (buttonCount <= 1) return 0;
		// Number of offscreen buttons -- round up because we can't have negative padding
		const overflowButtonCount = Math.max(0, Math.ceil((buttonCount * buttonSize - containerWidth) / buttonSize));
		const visibleButtonCount = buttonCount - overflowButtonCount;
		const allVisible = visibleButtonCount === buttonCount;
		if (allVisible) return 0;

		const targetContentWidth = containerWidth + buttonSize / 2;
		const actualContentWidth = visibleButtonCount * buttonSize;
		const widthDifference = targetContentWidth - actualContentWidth;
		// Only half of the gap for the rightmost visible button is on the screen
		const gapCount = visibleButtonCount - 1 / 2;
		return widthDifference / gapCount;
	}, [containerWidth, buttonCount, buttonSize]);

	return { onContainerLayout, buttonPadding };
};

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			content: {
				flexGrow: 0,
				backgroundColor: theme.backgroundColor3,
			},
			contentContainer: {
				flexGrow: 1,
				paddingVertical: 0,
				flexDirection: 'row',
			},
			spacer: {
				flexGrow: 1,
			},
		});
	}, [themeId]);
};

type SetSettingsVisible = React.Dispatch<React.SetStateAction<boolean>>;
const useSettingButtonInfo = (setSettingsVisible: SetSettingsVisible) => {
	return useMemo((): ToolbarButtonInfo => ({
		type: 'button',
		name: 'showToolbarSettings',
		tooltip: _('Settings'),
		iconName: 'material cogs',
		enabled: true,
		onClick: () => setSettingsVisible(true),
		title: '',
	}), [setSettingsVisible]);
};

const EditorToolbar: React.FC<Props> = props => {

	const buttonInfos: ToolbarButtonInfo[] = [];

	for (const info of props.toolbarButtonInfos) {
		if (info.type !== 'separator') {
			buttonInfos.push(info);
		}
	}

	// Include setting button in the count
	const buttonCount = buttonInfos.length + 1;
	const { buttonPadding, onContainerLayout } = useButtonPadding(buttonCount);
	const styles = useStyles(props.themeId);

	const renderButton = (info: ToolbarButtonInfo) => {
		return <ToolbarButton
			key={`command-${info.name}`}
			buttonInfo={info}
			themeId={props.themeId}
			extraPadding={buttonPadding}
			selected={isSelected(info.name, props.editorState)}
		/>;
	};

	const [settingsVisible, setSettingsVisible] = useState(false);
	const scrollViewRef = useRef<ScrollView|null>(null);
	const onDismissSettingsDialog = useCallback(() => {
		setSettingsVisible(false);

		// On Android, if the ScrollView isn't manually scrolled to the end,
		// all items can be invisible in some cases. This causes issues with
		// TalkBack on Android.
		// In particular, if 1) the toolbar initially has many items on a device
		// with a small screen, and 2) the user removes most items, then most/all
		// items are scrolled offscreen. Calling .scrollToEnd corrects this:
		scrollViewRef.current?.scrollToEnd();
	}, []);

	const settingsButtonInfo = useSettingButtonInfo(setSettingsVisible);
	const settingsButton = <ToolbarButton
		buttonInfo={settingsButtonInfo}
		extraPadding={buttonPadding}
		themeId={props.themeId}
	/>;

	return <>
		<ScrollView
			ref={scrollViewRef}
			horizontal={true}
			style={styles.content}
			contentContainerStyle={styles.contentContainer}
			onLayout={onContainerLayout}
		>
			{buttonInfos.map(renderButton)}
			<View style={styles.spacer}/>
			{settingsButton}
		</ScrollView>
		<ToolbarEditorDialog visible={settingsVisible} onDismiss={onDismissSettingsDialog} />
	</>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		toolbarButtonInfos: toolbarButtonsFromState(state),
	};
})(EditorToolbar);
