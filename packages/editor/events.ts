import type SelectionFormatting from './SelectionFormatting';
import type { SearchState } from './types';

export enum EditorEventType {
	Change,
	UndoRedoDepthChange,
	SelectionRangeChange,
	SelectionFormattingChange,
	UpdateSearchDialog,
	EditLink,
}

export interface ChangeEvent {
	kind: EditorEventType.Change;

	// New editor content
	value: string;
}

export interface UndoRedoDepthChangeEvent {
	kind: EditorEventType.UndoRedoDepthChange;

	undoDepth: number;
	redoDepth: number;
}

export interface SelectionRangeChangeEvent {
	kind: EditorEventType.SelectionRangeChange;

	start: number;
	end: number;
}

export interface SelectionFormattingChangeEvent {
	kind: EditorEventType.SelectionFormattingChange;
	formatting: SelectionFormatting;
}

export interface UpdateSearchDialogEvent {
	kind: EditorEventType.UpdateSearchDialog;
	searchState: SearchState;
}

export interface EditLinkEvent {
	kind: EditorEventType.EditLink;
}


export type EditorEvent =
		ChangeEvent|UndoRedoDepthChangeEvent|SelectionRangeChangeEvent|
			SelectionFormattingChangeEvent|UpdateSearchDialogEvent|
			EditLinkEvent;

