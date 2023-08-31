// Types related to the NoteEditor

import { EditorControl as EditorBodyControl, EditorSettings as EditorBodySettings } from '@joplin/editor/types';

// Controls for the entire editor (including dialogs)
export interface EditorControl extends EditorBodyControl {
	showLinkDialog(): void;
	hideLinkDialog(): void;
	hideKeyboard(): void;
}

export interface EditorSettings extends EditorBodySettings {
	themeId: number;
}

export interface SelectionRange {
	start: number;
	end: number;
}
