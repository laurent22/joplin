import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { OnEventCallback } from '../../types';
import { RendererControl } from '../types';

export interface EditorApi {
	renderer: RendererControl;
	onEvent: OnEventCallback;
}


export const getEditorApi = (state: EditorState) => {
	return joplinEditorApiPlugin.getState(state);
};

export const setEditorApi = (transaction: Transaction, api: EditorApi) => {
	return transaction.setMeta(joplinEditorApiPlugin, api);
};

// Stores the editor event handler callback in the editor state.
const joplinEditorApiPlugin = new Plugin<EditorApi>({
	state: {
		init: () => ({
			onEvent: ()=>{},
			renderer: {
				renderHtmlToMarkup: () => {
					throw new Error('Not initialized');
				},
				renderMarkupToHtml: () => {
					throw new Error('Not initialized');
				},
			},
		}),
		apply: (tr, value) => {
			const proposedValue = tr.getMeta(joplinEditorApiPlugin);
			if (proposedValue) {
				return proposedValue;
			}
			return value;
		},
	},
});

export default joplinEditorApiPlugin;
