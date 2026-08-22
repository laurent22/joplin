import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import findPositionMatchingLink from '../utils/findPositionMatchingLink';

const jumpToHash = (view: EditorView, hash: string) => {
	const targetLocation = findPositionMatchingLink(
		hash.startsWith('#') ? hash : `#${hash}`, view.state,
	);

	if (targetLocation !== undefined) {
		view.dispatch({
			selection: EditorSelection.cursor(targetLocation),
			effects: [
				// Scrolls the target header/anchor to the top of the editor --
				// users are usually interested in the content just below a header
				// when clicking on a header link.
				EditorView.scrollIntoView(targetLocation, { y: 'start' }),
			],
		});
		return true;
	}
	return false;
};

export default jumpToHash;
