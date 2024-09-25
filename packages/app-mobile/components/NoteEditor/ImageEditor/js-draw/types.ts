
export type SaveDrawingCallback = (svgElement: SVGElement, isAutosave: boolean)=> void;
export type UpdateEditorTemplateCallback = (newTemplate: string)=> void;

export interface ImageEditorCallbacks {
	saveDrawing: SaveDrawingCallback;
	updateEditorTemplate: UpdateEditorTemplateCallback;

	saveThenClose: (svgData: SVGElement)=> void;
	closeEditor: (promptIfUnsaved: boolean)=> void;
	setImageHasChanges: (hasChanges: boolean)=> void;
}

// Overrides translations in js-draw -- as of the time of this writing,
// Joplin has many common strings localized better than js-draw.
export interface LocalizedStrings {
	save: string;
	close: string;
	undo: string;
	redo: string;
}
