import { _ } from '@joplin/lib/locale';
import { ReactElement, useCallback, useState } from 'react';
import { LayoutChangeEvent, ScrollView, View } from 'react-native';
import ToggleOverflowButton from './ToggleOverflowButton';
import ToolbarButton, { buttonSize } from './ToolbarButton';
import { ButtonGroup, ButtonSpec, StyleSheetData } from './types';

const React = require('react');

type OnToggleOverflowCallback = ()=> void;
interface OverflowPopupProps {
	buttonGroups: ButtonGroup[];
	styleSheet: StyleSheetData;
	visible: boolean;

	// Should be created using useCallback
	onToggleOverflow: OnToggleOverflowCallback;
}

// Contains buttons that overflow the available space.
// Displays all buttons in [props.buttonGroups] if [props.visible].
// Otherwise, displays nothing.
const ToolbarOverflowRows = (props: OverflowPopupProps) => {
	const overflowRows: ReactElement[] = [];

	let key = 0;
	for (let i = 0; i < props.buttonGroups.length; i++) {
		key++;
		const row: ReactElement[] = [];

		const group = props.buttonGroups[i];
		for (let j = 0; j < group.items.length; j++) {
			key++;

			const buttonSpec = group.items[j];
			row.push(
				<ToolbarButton
					key={key.toString()}
					styleSheet={props.styleSheet}
					spec={buttonSpec}

					// After invoking this button's action, hide the overflow menu
					onActionComplete={props.onToggleOverflow}
				/>,
			);

			// Show the "hide overflow" button if in the center of the last row
			const isLastRow = i === props.buttonGroups.length - 1;
			const isCenterOfRow = j + 1 === Math.floor(group.items.length / 2);
			if (isLastRow && isCenterOfRow) {
				row.push(
					<ToggleOverflowButton
						key={(++key).toString()}
						styleSheet={props.styleSheet}
						overflowVisible={true}
						onToggleOverflowVisible={props.onToggleOverflow}
					/>,
				);
			}
		}

		overflowRows.push(
			<View
				key={key.toString()}
			>
				<ScrollView
					horizontal={true}
					contentContainerStyle={props.styleSheet.styles.toolbarContent}
				>
					{row}
				</ScrollView>
			</View>,
		);
	}

	const [hasSpaceForCloseBtn, setHasSpaceForCloseBtn] = useState(true);
	const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
		if (props.buttonGroups.length === 0) {
			return;
		}

		// Add 1 to account for the close button
		const totalButtonCount = props.buttonGroups[0].items.length + 1;

		const newWidth = event.nativeEvent.layout.width;
		setHasSpaceForCloseBtn(newWidth > totalButtonCount * buttonSize);
	}, [setHasSpaceForCloseBtn, props.buttonGroups]);

	const closeButtonSpec: ButtonSpec = {
		icon: '⨉',
		description: _('Close'),
		onPress: props.onToggleOverflow,
	};
	const closeButton = (
		<ToolbarButton
			styleSheet={props.styleSheet}
			spec={closeButtonSpec}
			style={{
				position: 'absolute',
				right: 0,
				zIndex: 1,
			}}
		/>
	);

	if (!props.visible) {
		return null;
	}
	return (
		<View
			style={{
				height: props.buttonGroups.length * buttonSize,
				flexDirection: 'column',
				flexGrow: 1,
			}}
			onLayout={onContainerLayout}
		>
			{hasSpaceForCloseBtn ? closeButton : null}
			{overflowRows}
		</View>
	);
};
export default ToolbarOverflowRows;
