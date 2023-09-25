import type SelectionFormatting from './SelectionFormatting';
import type { SearchState } from './types';

export enum EditorEventType {
	Change,
	UndoRedoDepthChange,
	SelectionRangeChange,
	SelectionFormattingChange,
	UpdateSearchDialog,
	EditLink,
	Scroll,
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

	anchor: number;
	head: number;

	from: number;
	to: number;
}

export interface SelectionFormattingChangeEvent {
	kind: EditorEventType.SelectionFormattingChange;
	formatting: SelectionFormatting;
}

export interface EditorScrolledEvent {
	kind: EditorEventType.Scroll;

	// A fraction from 0 to 1, where 1 corresponds to the end of the document
	fraction: number;
}

export interface UpdateSearchDialogEvent {
	kind: EditorEventType.UpdateSearchDialog;
	searchState: SearchState;
}

export interface RequestEditLinkEvent {
	kind: EditorEventType.EditLink;
}


export type EditorEvent =
		ChangeEvent|UndoRedoDepthChangeEvent|SelectionRangeChangeEvent|
			EditorScrolledEvent|
			SelectionFormattingChangeEvent|UpdateSearchDialogEvent|
			RequestEditLinkEvent;

