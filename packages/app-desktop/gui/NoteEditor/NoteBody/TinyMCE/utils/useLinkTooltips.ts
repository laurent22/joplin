import type { Editor } from 'tinymce';
import { useCallback, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';

const useLinkTooltips = (editor: Editor|null) => {
	const resetModifiedTitles = useCallback(() => {
		for (const element of editor.getDoc().querySelectorAll('a[data-joplin-original-title]')) {
			element.setAttribute('title', element.getAttribute('data-joplin-original-title') ?? '');
			element.removeAttribute('data-joplin-original-title');
		}
	}, [editor]);

	useEffect(() => {
		if (!editor) return () => {};

		const onMouseOver = (event: MouseEvent) => {
			let element = event.target as HTMLElement;

			// mouseover events seem to only target the lowest applicable node in the DOM.
			// If the user's mouse enters <a><strong></strong></a>, the mouseover event will
			// target the <strong></strong>. As such, the parent nodes need to be checked:
			let counter = 0;
			while (element.tagName !== 'A' || !('href' in element)) {
				element = element.parentElement;
				counter++;
				if (!element || counter > 4) {
					return;
				}
			}

			if (!element.hasAttribute('data-joplin-original-title')) {
				element.setAttribute('data-joplin-original-title', element.title);
			}

			// Avoid showing internal HREFs for note links.
			if (element.hasAttribute('data-resource-id') && !element.title) {
				if (shim.isMac()) {
					element.title = _('Cmd-click to open');
				} else {
					element.title = _('Ctrl-click to open');
				}
			} else {
				if (shim.isMac()) {
					element.title = _('Cmd-click to open: %s', element.title || element.href);
				} else {
					element.title = _('Ctrl-click to open: %s', element.title || element.href);
				}
			}

			const onMouseLeave = () => {
				resetModifiedTitles();
				element.removeEventListener('mouseleave', onMouseLeave);
			};
			element.addEventListener('mouseleave', onMouseLeave);
		};

		const clearRootEventListeners = () => {
			editor.getDoc().removeEventListener('mouseover', onMouseOver);
		};

		const setUpRootEventListeners = () => {
			clearRootEventListeners();
			editor.getDoc().addEventListener('mouseover', onMouseOver);
		};
		setUpRootEventListeners();
		editor.on('SetContent', setUpRootEventListeners);
		editor.on('keyup', resetModifiedTitles);
		editor.on('click', resetModifiedTitles);

		return () => {
			resetModifiedTitles();
			editor.off('SetContent', setUpRootEventListeners);
			editor.off('keyup', resetModifiedTitles);
			editor.off('click', resetModifiedTitles);
			clearRootEventListeners();
		};
	}, [editor, resetModifiedTitles]);

	return { resetModifiedTitles };
};

export default useLinkTooltips;
