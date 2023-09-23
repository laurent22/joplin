
export type SaveDrawingCallback = (svgElement: SVGElement, isAutosave: boolean)=> void;
export type UpdateEditorTemplateCallback = (newTemplate: string)=> void;

export interface ImageEditorCallbacks {
	saveDrawing: SaveDrawingCallback;
	updateEditorTemplate: UpdateEditorTemplateCallback;

	closeEditor: ()=> void;
	setImageHasChanges: (hasChanges: boolean)=> void;
}

export interface LocalizableStrings {
	autosaving: string;
}

