
export type SaveDrawingCallback = (svgElement: SVGElement, isAutosave: boolean)=> void;
export type UpdateEditorTemplateCallback = (newTemplate: string)=> void;

export interface ImageEditorCallbacks {
	saveDrawing: SaveDrawingCallback;
	updateEditorTemplate: UpdateEditorTemplateCallback;

	closeEditor: (promptIfUnsaved: boolean)=> void;
	setImageHasChanges: (hasChanges: boolean)=> void;
}
