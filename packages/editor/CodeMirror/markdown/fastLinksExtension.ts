import { EditorSelection, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import intersectsAnySyntaxNodeOf from '../util/intersectsAnySyntaxNodeOf';

const fastLinksExtension: ()=> Extension = () => {
	const eventHandlers = EditorView.domEventHandlers({
		paste: (event, view) => {
			if (view.state.selection.main.empty) {
				return false;
			}

			// Don't try to paste as a link if files (e.g. images) could be
			// pasted instead.
			if (event.clipboardData?.files?.length > 0) {
				return false;
			}

			const clipboardText = event.clipboardData?.getData('text/plain') ?? '';

			const httpUrlRegex = /^https?:\/\/\S+$/;
			const resourceUrlRegex = /^:\/[a-zA-Z0-9]+$/;
			if (!httpUrlRegex.exec(clipboardText) && !resourceUrlRegex.exec(clipboardText)) {
				return false;
			}

			// Don't linkify if the user could be trying to change an existing link
			if (intersectsAnySyntaxNodeOf(view.state, view.state.selection.main, ['Link', 'Image', 'URL'])) {
				return false;
			}

			view.dispatch(view.state.changeByRange(selection => {
				const selectedText = view.state.sliceDoc(selection.from, selection.to);

				if (selection.empty || selectedText.includes('\n')) {
					return {
						range: EditorSelection.range(selection.from, selection.from + clipboardText.length),
						changes: [{
							from: selection.from,
							to: selection.to,
							insert: clipboardText,
						}],
					};
				} else {
					const replaceWith = `[${selectedText}](${clipboardText})`;
					return {
						range: EditorSelection.range(selection.from, selection.from + replaceWith.length),
						changes: [{
							from: selection.from,
							to: selection.to,
							insert: replaceWith,
						}],
					};
				}
			}));

			return true;
		},
	});
	return eventHandlers;
};

export default fastLinksExtension;
