import { Command, TextSelection } from 'prosemirror-state';
import { focus } from '@joplin/lib/utils/focusHandler';
import forEachHeading from './forEachHeading';

const jumpToHash = (targetHash: string): Command => (state, dispatch, view) => {
	if (targetHash.startsWith('#')) {
		targetHash = targetHash.substring(1);
	}

	let targetHeaderPos: number|null = null;
	forEachHeading(view.state.doc, (node, hash, pos) => {
		if (hash === targetHash) {
			// Subtract one to move the selection to the end of
			// the node:
			targetHeaderPos = pos + node.nodeSize - 1;
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
