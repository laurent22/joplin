import { EditorView } from '@codemirror/view';
import findLineMatchingLink from './findLineMatchingLink';

export type OnOpenExternalLink = (url: string, view: EditorView)=> void;
const openLink = (link: string, view: EditorView, onOpenExternalLink: OnOpenExternalLink) => {
	const targetLine = findLineMatchingLink(link, view.state);
	if (targetLine) {
		view.dispatch({
			selection: { anchor: targetLine.to },
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
