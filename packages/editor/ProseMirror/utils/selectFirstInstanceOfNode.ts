import { NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const selectFirstInstanceOfNode = (view: EditorView, nodeName: string) => {
	const state = view.state;

	let index = -1;
	state.doc.descendants((node, pos) => {
		if (node.type.name === nodeName) {
			index = pos;
		}
	});
	if (index >= 0) {
		view.dispatch(
			state.tr.setSelection(NodeSelection.create(view.state.doc, index)),
		);
	}
};

export default selectFirstInstanceOfNode;
