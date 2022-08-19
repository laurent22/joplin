
import { ReactElement } from 'react';

export type OnPressListener = ()=> void;

export interface ButtonSpec {
	// Either text that will be shown in place of an icon or a component.
	icon: string | ReactElement;
	accessibilityLabel: string;
	onPress: OnPressListener;

	// True if the button is connected to an enabled action.
	// E.g. the cursor is in a header and the button is a header button.
	active?: boolean;
	disabled?: boolean;
}

export interface ButtonGroup {
	title: string;
	items: ButtonSpec[];
}
