import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { OnEventCallback, OnLocalize } from '../../types';
import { OnCreateCodeEditor, RendererControl } from '../types';
import { focus } from '@joplin/lib/utils/focusHandler';
import createTextArea from '../utils/dom/createTextArea';

export interface EditorApi {
	renderer: RendererControl;
	onEvent: OnEventCallback;
	createCodeEditor: OnCreateCodeEditor;
	localize: OnLocalize;
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
			localize: input => input,

			// A default implementation for testing environments
			createCodeEditor: (parent, _language, onChange) => {
				const editor = createTextArea({ label: 'Editor', initialContent: '', onChange });
				parent.appendChild(editor.textArea);

				return {
					focus: () => focus('joplinEditorApiPlugin', editor.textArea),
					remove: () => {
						editor.textArea.remove();
					},
					updateBody: (newValue) => {
						editor.textArea.value = newValue;
					},
					select: (anchor, head) => {
						editor.textArea.setSelectionRange(Math.min(anchor, head), Math.max(anchor, head));
					},
				};
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
