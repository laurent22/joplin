import { Command, TextSelection } from 'prosemirror-state';
import { focus } from '@joplin/lib/utils/focusHandler';
import forEachHeading from './forEachHeading';

const jumpToHash = (targetHash: string): Command => (state, dispatch, view) => {
	if (targetHash.startsWith('#')) {
		targetHash = targetHash.substring(1);
	}

	let targetHeaderPos: number|null = null;
	let targetHeadingNodePos: number|null = null;
	forEachHeading(view.state.doc, (node, hash, pos) => {
		if (hash === targetHash) {
			// Subtract one to move the selection to the end of
			// the node:
			targetHeaderPos = pos + node.nodeSize - 1;
			targetHeadingNodePos = pos;
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
				// Scroll the heading to the top of the viewport, consistent with view
				// mode behavior. Uses window.scrollTo to avoid relying on scrollIntoView
				// option support across WebView versions.
				const headingDom = view.nodeDOM(targetHeadingNodePos);
				if (headingDom instanceof Element) {
					const rect = headingDom.getBoundingClientRect();
					window.scrollTo(0, window.scrollY + rect.top);
				}
				focus('jumpToHash', view);
			}
		}

		return true;
	}

	return false;
};

export default jumpToHash;
