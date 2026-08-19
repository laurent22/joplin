import SelectionFormatting from '@joplin/editor/SelectionFormatting';

export interface EditorState {
	selectionState: SelectionFormatting;
	searchVisible: boolean;
}
