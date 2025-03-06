
export type SaveDrawingCallback = (svgData: string, isAutosave: boolean)=> void;
export type UpdateEditorTemplateCallback = (newTemplate: string)=> void;
export type UpdateToolbarCallback = (toolbarData: string)=> void;

export interface ImageEditorCallbacks {
	onLoadedEditor: ()=> void;

	save: SaveDrawingCallback;
	updateEditorTemplate: UpdateEditorTemplateCallback;
	updateToolbarState: UpdateToolbarCallback;

	saveThenClose: (svgData: string)=> void;
	closeEditor: (promptIfUnsaved: boolean)=> void;
	setImageHasChanges: (hasChanges: boolean)=> void;

	writeClipboardText: (text: string)=> Promise<void>;
	readClipboardText: ()=> Promise<string>;
}

export interface ImageEditorControl {}

// Overrides translations in js-draw -- as of the time of this writing,
// Joplin has many common strings localized better than js-draw.
export interface LocalizedStrings {
	save: string;
	close: string;
	undo: string;
	redo: string;
}
