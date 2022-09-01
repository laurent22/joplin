
import { ReactElement } from 'react';

export type OnPressListener = ()=> void;

export interface ButtonSpec {
	// Either text that will be shown in place of an icon or a component.
	icon: string | ReactElement;

	// Tooltip/accessibility label
	description: string;
	onPress: OnPressListener;

	// Priority for showing the button in the main toolbar.
	// Higher priority => more likely to be shown on the left of the toolbar
	// Lower (negative) priority => more likely to be shown on the right side of the
	// toolbar.
	priority?: number;

	// True if the button is connected to an enabled action.
	// E.g. the cursor is in a header and the button is a header button.
	active?: boolean;
	disabled?: boolean;
	visible?: boolean;
}

export interface ButtonGroup {
	title: string;
	items: ButtonSpec[];
}

export interface StyleSheetData {
	themeId: number;
	styles: any;
}
