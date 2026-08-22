import { EditorView } from '@codemirror/view';
import findPositionMatchingLink from '../../../utils/findPositionMatchingLink';

export type OnOpenExternalLink = (url: string, view: EditorView)=> void;
const openLink = (link: string, view: EditorView, onOpenExternalLink: OnOpenExternalLink) => {
	const target = findPositionMatchingLink(link, view.state);
	if (target !== null) {
		const targetLine = view.state.doc.lineAt(target);
		view.dispatch({
			selection: { anchor: target },
			scrollIntoView: true,
			effects: [
				EditorView.announce.of(`Jumped to line ${targetLine.number}`),
			],
		});
		// eslint-disable-next-line no-restricted-properties -- Old code from before rule was applied
		view.focus();
	} else {
		onOpenExternalLink(link, view);
	}
};

export default openLink;
