// Types related to the NoteEditor

export interface ChangeEvent {
	// New editor content
	value: string;
}

export interface UndoRedoDepthChangeEvent {
	undoDepth: number;
	redoDepth: number;
}

export interface Selection {
	start: number;
	end: number;
}

export interface SelectionChangeEvent {
	selection: Selection;
}

export interface EditorControl {
    // A reference to the CodeMirror EditorView.
    // Use for debugging.
    editor: any;

	undo(): void;
	redo(): void;
	select(anchor: number, head: number): void;
	insertText(text: string): void;
	scrollSelectionIntoView(): void;
}

export interface EditorSettings {
    themeData: any;
    katexEnabled: boolean;
}
