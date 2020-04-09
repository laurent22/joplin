const joplinRendererUtils = require('lib/joplin-renderer').utils;
const Resource = require('lib/models/Resource');

export interface DefaultEditorState {
	value: string,
	markupLanguage: number, // MarkupToHtml.MARKUP_LANGUAGE_XXX
	resourceInfos: any,
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

export function resourcesStatus(resourceInfos:any) {
	let lowestIndex = joplinRendererUtils.resourceStatusIndex('ready');
	for (const id in resourceInfos) {
		const s = joplinRendererUtils.resourceStatus(Resource, resourceInfos[id]);
		const idx = joplinRendererUtils.resourceStatusIndex(s);
		if (idx < lowestIndex) lowestIndex = idx;
	}
	return joplinRendererUtils.resourceStatusName(lowestIndex);
}
