export interface DefaultEditorState {
	value: string,
	markupLanguage: number, // MarkupToHtml.MARKUP_LANGUAGE_XXX
}

export interface OnChangeEvent {
	changeId: number,
	content: any,
}

export interface TextEditorUtils {
	editorContentToHtml(content:any):Promise<string>,
}

export interface EditorCommand {
	name: string,
	value: any,
}
