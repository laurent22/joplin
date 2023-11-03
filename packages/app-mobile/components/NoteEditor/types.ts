// Types related to the NoteEditor

import { EditorControl as EditorBodyControl, EditorSettings as EditorBodySettings, SearchState } from '@joplin/editor/types';

export interface SearchControl {
	findNext(): void;
	findPrevious(): void;
	replaceNext(): void;
	replaceAll(): void;
	showSearch(): void;
	hideSearch(): void;
	setSearchState(state: SearchState): void;
}

// Controls for the entire editor (including dialogs)
export interface EditorControl extends EditorBodyControl {
	showLinkDialog(): void;
	hideLinkDialog(): void;
	hideKeyboard(): void;

	// Additional shortcut commands (equivalent to .execCommand
	// with the corresponding type).
	// This reduces the need for useCallbacks in many cases.
	undo(): void;
	redo(): void;

	increaseIndent(): void;
	decreaseIndent(): void;
	toggleBolded(): void;
	toggleItalicized(): void;
	toggleCode(): void;
	toggleMath(): void;
	toggleOrderedList(): void;
	toggleUnorderedList(): void;
	toggleTaskList(): void;
	toggleHeaderLevel(level: number): void;

	scrollSelectionIntoView(): void;
	showLinkDialog(): void;
	hideLinkDialog(): void;
	hideKeyboard(): void;

	searchControl: SearchControl;
}

export interface EditorSettings extends EditorBodySettings {
	themeId: number;
}

export interface SelectionRange {
	start: number;
	end: number;
}
