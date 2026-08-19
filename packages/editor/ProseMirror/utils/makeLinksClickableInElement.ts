import { EditorView } from 'prosemirror-view';
import jumpToHash from './jumpToHash';
import { getEditorApi } from '../plugins/joplinEditorApiPlugin';
import { EditorEventType } from '../../events';

const makeLinksClickableInElement = (element: HTMLElement, view: EditorView) => {
	const followLink = (target: HTMLAnchorElement) => {
		const href = target.getAttribute('href');
		if (href) {
			if (href.startsWith('#')) {
				return jumpToHash(href)(view.state, view.dispatch, view);
			} else {
				getEditorApi(view.state).onEvent({
					kind: EditorEventType.FollowLink,
					link: href,
				});
				return true;
			}
		}
		return false;
	};

	element.addEventListener('click', event => {
		if (event.target instanceof Element && !event.defaultPrevented) {
			const closestLink = event.target.closest<HTMLAnchorElement>('a[href]');
			if (closestLink && followLink(closestLink)) {
				event.preventDefault();
			}
		}
	});
};

export default makeLinksClickableInElement;
