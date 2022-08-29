const React = require('react');

import { _ } from '@joplin/lib/locale';
import ToolbarButton from './ToolbarButton';
import { ButtonSpec, StyleSheetData } from './types';
const MaterialIcon = require('react-native-vector-icons/MaterialIcons').default;

type OnToggleOverflowCallback = ()=> void;
interface ToggleOverflowButtonProps {
	overflowVisible: boolean;
	onToggleOverflowVisible: OnToggleOverflowCallback;
	styleSheet: StyleSheetData;
}

// Button that shows/hides the overflow menu.
const ToggleOverflowButton = (props: ToggleOverflowButtonProps) => {
	const spec: ButtonSpec = {
		icon: (
			<MaterialIcon name="more-horiz" style={props.styleSheet.styles.text}/>
		),
		description:
			props.overflowVisible ? _('Hide more actions') : _('Show more actions'),
		active: props.overflowVisible,
		onPress: props.onToggleOverflowVisible,
	};

	return (
		<ToolbarButton
			styleSheet={props.styleSheet}
			spec={spec}
		/>
	);
};
export default ToggleOverflowButton;
