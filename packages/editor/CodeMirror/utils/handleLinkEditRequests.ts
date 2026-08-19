import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export const showLinkEditorEffect = StateEffect.define<void>();

export const showLinkEditor = (view: EditorView) => {
	view.dispatch({
		effects: [
			showLinkEditorEffect.of(),
		],
	});
	return true;
};

const handleLinkEditRequests = (onShowEditor: ()=> void) => [
	EditorState.transactionExtender.of(tr => {
		if (tr.effects.some(e => e.is(showLinkEditorEffect))) {
			onShowEditor();
		}

		return null;
	}),
];

export default handleLinkEditRequests;
