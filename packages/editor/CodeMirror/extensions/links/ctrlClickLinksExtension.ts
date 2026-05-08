import { EditorView } from '@codemirror/view';
import referenceLinkStateField from './referenceLinksStateField';
import modifierKeyCssExtension from '../modifierKeyCssExtension';
import openLink from './utils/openLink';
import getUrlAtPosition from './utils/getUrlAtPosition';
import { syntaxTree } from '@codemirror/language';
import ctrlClickActionExtension from '../ctrlClickActionExtension';

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
		ctrlClickActionExtension((view: EditorView, event: MouseEvent) => {
			const target = view.posAtCoords(event);
			const url = getUrlAtPosition(target, syntaxTree(view.state), view.state);

			if (url) {
				openLink(url.url, view, onOpenExternalLink);
				return true;
			}
			return false;
		}),
	];
};

export default ctrlClickLinksExtension;
