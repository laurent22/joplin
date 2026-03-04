import type { Editor } from 'tinymce';

export const isPdfUrl = (url: string): boolean => {
	try {
		return new URL(url).pathname.toLowerCase().endsWith('.pdf');
	} catch {
		// URL constructor rejects relative paths and some resource URIs —
		// fall back to a plain string check.
		return url.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf');
	}
};

// Transforms <a href="...pdf"> links into non-editable iframe wrappers for
// inline rendering. A hidden <a> is preserved inside the wrapper so that
// restorePdfEmbedsToLinks can reconstruct the original link on save.
export const embedPdfLinks = (editorInstance: Editor): void => {
	const doc = editorInstance.dom.doc;
	for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
		const href = anchor.getAttribute('href');
		if (!href || !isPdfUrl(href)) continue;
		if (anchor.closest('.joplin-pdf-embed-wrapper')) continue;

		const wrapper = doc.createElement('div');
		wrapper.className = 'joplin-editable joplin-pdf-embed-wrapper';
		wrapper.setAttribute('contenteditable', 'false');

		const iframe = doc.createElement('iframe');
		iframe.src = href;
		iframe.className = 'joplin-pdf-embed';
		iframe.setAttribute('width', '100%');
		iframe.setAttribute('height', '500');
		iframe.style.cssText = 'border:none;display:block;';

		const hiddenAnchor = anchor.cloneNode(true) as HTMLAnchorElement;
		hiddenAnchor.setAttribute('data-joplin-pdf-hidden', 'true');
		hiddenAnchor.style.display = 'none';

		wrapper.appendChild(iframe);
		wrapper.appendChild(hiddenAnchor);

		// Replace the parent block rather than just the anchor to avoid
		// producing <p><div>...</div></p>, which is invalid HTML and
		// causes TinyMCE to misplace the caret.
		const parent = anchor.parentElement;
		const blockTags = ['P', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'DD', 'DT', 'CAPTION'];
		const isOnlyChildOfBlock =
			parent !== null &&
			blockTags.includes(parent.tagName) &&
			Array.from(parent.childNodes).every(
				n => n === anchor ||
					(n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()),
			);

		if (isOnlyChildOfBlock && parent.parentNode) {
			wrapper.setAttribute('data-joplin-restore-tag', parent.tagName.toLowerCase());
			parent.parentNode.replaceChild(wrapper, parent);
		} else {
			wrapper.setAttribute('data-joplin-restore-tag', 'inline');
			anchor.parentNode?.replaceChild(wrapper, anchor);
		}
	}
};

// Appends a sentinel <p> when the last element in the editor body is a
// non-editable block, so TinyMCE always has a valid caret target below the
// last embed.
export const ensureTrailingEditableParagraph = (editorInstance: Editor): void => {
	const body = editorInstance.dom.doc.body;
	if (!body) return;
	const lastChild = body.lastElementChild;
	if (!lastChild) return;
	const isNonEditable =
		lastChild.classList.contains('joplin-editable') ||
		lastChild.getAttribute('contenteditable') === 'false';
	if (!isNonEditable) return;
	const p = editorInstance.dom.doc.createElement('p');
	p.setAttribute('data-joplin-cursor-spacer', 'true');
	p.appendChild(editorInstance.dom.doc.createElement('br'));
	body.appendChild(p);
};

// Reverses embedPdfLinks before save. Restores the anchor into the original
// block element (stored in data-joplin-restore-tag) or inline if the anchor
// had siblings. Empty cursor-spacer paragraphs are removed; non-empty ones
// have only their sentinel attribute stripped.
export const restorePdfEmbedsToLinks = (html: string): string => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	for (const wrapper of doc.querySelectorAll('.joplin-pdf-embed-wrapper')) {
		const hiddenAnchor = wrapper.querySelector<HTMLAnchorElement>('a[data-joplin-pdf-hidden]');
		if (!hiddenAnchor || !wrapper.parentNode) continue;
		hiddenAnchor.removeAttribute('data-joplin-pdf-hidden');
		hiddenAnchor.style.removeProperty('display');
		if (!hiddenAnchor.getAttribute('style')) {
			hiddenAnchor.removeAttribute('style');
		}
		const restoreTag = wrapper.getAttribute('data-joplin-restore-tag') ?? 'p';
		if (restoreTag === 'inline') {
			wrapper.parentNode.replaceChild(hiddenAnchor, wrapper);
		} else {
			const block = doc.createElement(restoreTag);
			block.appendChild(hiddenAnchor);
			wrapper.parentNode.replaceChild(block, wrapper);
		}
	}

	for (const spacer of doc.querySelectorAll<HTMLElement>('[data-joplin-cursor-spacer]')) {
		spacer.removeAttribute('data-joplin-cursor-spacer');
		const hasOnlyBr =
			!spacer.textContent?.trim() &&
			(spacer.children.length === 0 ||
				(spacer.children.length === 1 && spacer.children[0].tagName === 'BR'));
		if (hasOnlyBr) {
			spacer.parentNode?.removeChild(spacer);
		}
	}

	return doc.body.innerHTML;
};
