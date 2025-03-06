import SelectionFormatting from '@joplin/editor/SelectionFormatting';
import { EditorCommandType } from '@joplin/editor/types';
import { EditorState } from '../types';

type StateSelector = (selectionState: SelectionFormatting, searchVisible: boolean)=> boolean;

const commandNameToSelectionState: Record<string, StateSelector> = {
	[EditorCommandType.ToggleBolded]: state => state.bolded,
	[EditorCommandType.ToggleItalicized]: state => state.italicized,
	[EditorCommandType.ToggleCode]: state => state.inCode,
	[EditorCommandType.ToggleMath]: state => state.inMath,
	[EditorCommandType.ToggleHeading1]: state => state.headerLevel === 1,
	[EditorCommandType.ToggleHeading2]: state => state.headerLevel === 2,
	[EditorCommandType.ToggleHeading3]: state => state.headerLevel === 3,
	[EditorCommandType.ToggleHeading4]: state => state.headerLevel === 4,
	[EditorCommandType.ToggleHeading5]: state => state.headerLevel === 5,

	[EditorCommandType.ToggleBulletedList]: state => state.inUnorderedList,
	[EditorCommandType.ToggleNumberedList]: state => state.inOrderedList,
	[EditorCommandType.ToggleCheckList]: state => state.inChecklist,
	[EditorCommandType.EditLink]: state => state.inLink,
	[EditorCommandType.ToggleSearch]: (_selectionState, searchVisible) => searchVisible,
};

// Returns undefined if not a toggle button
const isSelected = (commandName: string, editorState: EditorState) => {
	// Newer editor commands are registered with the "editor." prefix. Remove this
	// prefix to simplify looking up the selection state:
	commandName = commandName.replace(/^editor\./, '');

	if (commandName in commandNameToSelectionState) {
		if (!editorState) return false;
		return commandNameToSelectionState[commandName as EditorCommandType](
			editorState.selectionState, editorState.searchVisible,
		);
	}
	return undefined;
};

export default isSelected;
