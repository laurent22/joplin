import { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import ToggleOverflowButton from './ToggleOverflowButton';
import ToolbarButton, { buttonSize } from './ToolbarButton';
import { ButtonGroup } from './types';

const React = require('react');

type OnToggleOverflowCallback = ()=> void;
interface OverflowPopupProps {
	buttonGroups: ButtonGroup[];
	styleSheet: any;
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
				/>
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
					/>
				);
			}
		}

		overflowRows.push(
			<View
				key={key.toString()}
			>
				<ScrollView
					horizontal={true}
					contentContainerStyle={props.styleSheet.toolbarContent}
				>
					{row}
				</ScrollView>
			</View>
		);
	}

	if (!props.visible) {
		return null;
	}

	return (
		<View style={{
			height: props.buttonGroups.length * buttonSize,
			flexDirection: 'column',
		}}>
			{overflowRows}
		</View>
	);
};
export default ToolbarOverflowRows;
