import { EditorView } from '@codemirror/view';
import referenceLinkStateField from './referenceLinksStateField';
import modifierKeyCssExtension from '../modifierKeyCssExtension';
import openLink from './utils/openLink';
import getUrlAtPosition from './utils/getUrlAtPosition';
import { syntaxTree } from '@codemirror/language';
import { Prec } from '@codemirror/state';


type OnOpenLink = (url: string, view: EditorView)=> void;


const ctrlClickLinksExtension = (onOpenExternalLink: OnOpenLink) => {
	return [
		modifierKeyCssExtension,
		referenceLinkStateField,
		EditorView.theme({
			'&.-ctrl-or-cmd-pressed .cm-url, &.-ctrl-or-cmd-pressed .tok-link': {
				cursor: 'pointer',
			},
		}),
		Prec.high([
			EditorView.domEventHandlers({
				mousedown: (event: MouseEvent, view: EditorView) => {
					if (event.ctrlKey || event.metaKey) {
						const target = view.posAtCoords(event);
						const url = getUrlAtPosition(target, syntaxTree(view.state), view.state);
						const hasMultipleCursors = view.state.selection.ranges.length > 1;

						// The default CodeMirror action for ctrl-click is to add another cursor
						// to the document. If the user already has multiple cursors, assume that
						// the ctrl-click action is intended to add another.
						if (url && !hasMultipleCursors) {
							openLink(url.url, view, onOpenExternalLink);
							event.preventDefault();
							return true;
						}
					}
					return false;
				},
			}),
		]),
	];
};

export default ctrlClickLinksExtension;
