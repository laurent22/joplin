
import { TextStyle, ViewStyle } from 'react-native';
import { EditorControl, EditorSettings } from '../types';
import SelectionFormatting from '@joplin/editor/SelectionFormatting';
import { SearchState } from '@joplin/editor/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';


export type OnPressListener = ()=> void;

export interface ButtonSpec {
	// Name of an icon, as accepted by components/Icon.tsx
	icon: string;

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

type OnAttachCallback = ()=> void;
export interface MarkdownToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	searchState: SearchState;
	editorSettings: EditorSettings;
	pluginStates: PluginStates;
	onAttach: OnAttachCallback;
	style?: ViewStyle;
	readOnly: boolean;
}

export interface ButtonRowProps extends MarkdownToolbarProps {
	iconStyle: TextStyle;
}
