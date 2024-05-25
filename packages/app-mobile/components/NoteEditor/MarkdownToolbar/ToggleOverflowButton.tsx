import * as React from 'react';

import { _ } from '@joplin/lib/locale';
import ToolbarButton from './ToolbarButton';
import { ButtonSpec, StyleSheetData } from './types';

type OnToggleOverflowCallback = ()=> void;
interface ToggleOverflowButtonProps {
	overflowVisible: boolean;
	onToggleOverflowVisible: OnToggleOverflowCallback;
	styleSheet: StyleSheetData;
}

// Button that shows/hides the overflow menu.
const ToggleOverflowButton: React.FC<ToggleOverflowButtonProps> = (props: ToggleOverflowButtonProps) => {
	const spec: ButtonSpec = {
		icon: 'material dots-horizontal',
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
