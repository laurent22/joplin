import { Command, TextSelection } from 'prosemirror-state';
import uslug from '@joplin/fork-uslug/lib/uslug';
import { NodeType } from 'prosemirror-model';
import { focus } from '@joplin/lib/utils/focusHandler';

const jumpToHash = (targetHash: string, headingType: NodeType): Command => (state, dispatch, view) => {
	let targetHeaderPos: number|null = null;
	state.doc.descendants((node, pos) => {
		if (node.type === headingType) {
			const hash = uslug(node.textContent);
			if (hash === targetHash) {
				// Subtract one to move the selection to the end of
				// the node:
				targetHeaderPos = pos + node.nodeSize - 1;
			}
		}

		return targetHeaderPos !== null;
	});

	if (targetHeaderPos !== null) {
		const newSelection = TextSelection.create(state.doc, targetHeaderPos);
		if (dispatch) {
			dispatch(
				state.tr.setSelection(newSelection)
					.scrollIntoView(),
			);
			if (view) {
				focus('jumpToHash', view);
			}
		}

		return true;
	}

	return false;
};

export default jumpToHash;
