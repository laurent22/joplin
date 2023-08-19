const React = require('react');

import { ReactElement, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, View, ViewStyle } from 'react-native';
import ToggleOverflowButton from './ToggleOverflowButton';
import ToolbarButton, { buttonSize } from './ToolbarButton';
import ToolbarOverflowRows from './ToolbarOverflowRows';
import { ButtonGroup, ButtonSpec, StyleSheetData } from './types';

interface ToolbarProps {
	buttons: ButtonGroup[];
	styleSheet: StyleSheetData;
	style?: ViewStyle;
}

// Displays a list of buttons with an overflow menu.
const Toolbar = (props: ToolbarProps) => {
	const [overflowButtonsVisible, setOverflowPopupVisible] = useState(false);
	const [maxButtonsEachSide, setMaxButtonsEachSide] = useState(0);

	const allButtonSpecs = useMemo(() => {
		const buttons = props.buttons.reduce((accumulator: ButtonSpec[], current: ButtonGroup) => {
			const newItems: ButtonSpec[] = [];
			for (const item of current.items) {
				if (item.visible ?? true) {
					newItems.push(item);
				}
			}

			return accumulator.concat(...newItems);
		}, []);

		// Sort from highest priority to lowest
		buttons.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
		return buttons;
	}, [props.buttons]);

	const allButtonComponents: ReactElement[] = [];
	let key = 0;
	for (const spec of allButtonSpecs) {
		key++;
		allButtonComponents.push(
			<ToolbarButton
				key={key.toString()}
				styleSheet={props.styleSheet}
				spec={spec}
			/>
		);
	}

	const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
		const containerWidth = event.nativeEvent.layout.width;
		const maxButtonsTotal = Math.floor(containerWidth / buttonSize);
		setMaxButtonsEachSide(Math.floor(
			Math.min((maxButtonsTotal - 1) / 2, allButtonSpecs.length / 2)
		));
	}, [allButtonSpecs.length]);

	const onToggleOverflowVisible = useCallback(() => {
		setOverflowPopupVisible(!overflowButtonsVisible);
	}, [overflowButtonsVisible]);

	const toggleOverflowButton = (
		<ToggleOverflowButton
			key={(++key).toString()}
			styleSheet={props.styleSheet}
			overflowVisible={overflowButtonsVisible}
			onToggleOverflowVisible={onToggleOverflowVisible}
		/>
	);

	const mainButtons: ReactElement[] = [];
	if (maxButtonsEachSide >= allButtonComponents.length) {
		mainButtons.push(...allButtonComponents);
	} else if (maxButtonsEachSide > 0) {
		// We want the menu to look something like this:
		// 			B I (…) 🔍 ⌨
		// where (…) shows/hides overflow.
		// Add from the left and right of [allButtonComponents] to ensure that
		// the (…) button is in the center:
		mainButtons.push(...allButtonComponents.slice(0, maxButtonsEachSide));
		mainButtons.push(toggleOverflowButton);
		mainButtons.push(...allButtonComponents.slice(-maxButtonsEachSide));
	} else {
		mainButtons.push(toggleOverflowButton);
	}

	const styles = props.styleSheet.styles;
	const mainButtonRow = (
		<View style={styles.toolbarRow}>
			{ mainButtons }
		</View>
	);

	return (
		<View
			style={{
				...styles.toolbarContainer,

				// The number of buttons displayed is based on the width of the
				// container. As such, we can't base the container's width on the
				// size of its content.
				width: '100%',

				...props.style,
			}}
			onLayout={onContainerLayout}
		>
			<ScrollView>
				<ToolbarOverflowRows
					buttonGroups={props.buttons}
					styleSheet={props.styleSheet}
					visible={overflowButtonsVisible}
					onToggleOverflow={onToggleOverflowVisible}
				/>
			</ScrollView>
			{ !overflowButtonsVisible ? mainButtonRow : null }
		</View>
	);
};
export default Toolbar;
