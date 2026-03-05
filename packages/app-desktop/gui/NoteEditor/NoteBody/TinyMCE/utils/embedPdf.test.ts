import type { Editor } from 'tinymce';
import {
	isPdfUrl,
	embedPdfLinks,
	ensureTrailingEditableParagraph,
	restorePdfEmbedsToLinks,
} from './embedPdf';

const createMockEditor = (bodyHtml: string): Editor => {
	const doc = document.implementation.createHTMLDocument('');
	doc.body.innerHTML = bodyHtml;
	return { dom: { doc } } as unknown as Editor;
};

describe('embedPdf', () => {
	test.each<[string, string, boolean]>([
		['detects a simple file:// PDF URL', 'file:///path/to/file.pdf', true],
		['is case-insensitive', 'file:///path/to/FILE.PDF', true],
		['ignores query strings', 'file:///path/to/file.pdf?v=1', true],
		['ignores fragments', 'file:///path/to/file.pdf#page=2', true],
		['returns false for a non-PDF URL', 'file:///path/to/image.png', false],
		['handles a relative path via fallback', 'documents/report.pdf', true],
	])('isPdfUrl: %s', (_, url, expected) => {
		expect(isPdfUrl(url)).toBe(expected);
	});

	test('embedPdfLinks: replaces a PDF link that is the sole child of <p> with a wrapper div', () => {
		const editor = createMockEditor('<p><a href="file:///a.pdf">a.pdf</a></p>');
		embedPdfLinks(editor);
		const body = editor.dom.doc.body;
		expect(body.querySelector('p')).toBeNull();
		const wrapper = body.querySelector('.joplin-pdf-embed-wrapper');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute('contenteditable')).toBe('false');
		expect(wrapper?.getAttribute('data-joplin-restore-tag')).toBe('p');
	});

	test('embedPdfLinks: the wrapper contains a hidden anchor with original attributes', () => {
		const editor = createMockEditor('<p><a href="file:///a.pdf" title="My PDF">a.pdf</a></p>');
		embedPdfLinks(editor);
		const hidden = editor.dom.doc.querySelector<HTMLAnchorElement>('a[data-joplin-pdf-hidden]');
		expect(hidden).not.toBeNull();
		expect(hidden?.getAttribute('title')).toBe('My PDF');
		expect(hidden?.style.display).toBe('none');
	});

	test('embedPdfLinks: sets restore-tag to "inline" when anchor has sibling text content', () => {
		const editor = createMockEditor('<p>See <a href="file:///a.pdf">a.pdf</a> here</p>');
		embedPdfLinks(editor);
		expect(editor.dom.doc.querySelector('p')).not.toBeNull();
		const wrapper = editor.dom.doc.querySelector('.joplin-pdf-embed-wrapper');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute('data-joplin-restore-tag')).toBe('inline');
	});

	test('embedPdfLinks: does not double-wrap an already-wrapped anchor', () => {
		const editor = createMockEditor(
			'<div class="joplin-editable joplin-pdf-embed-wrapper" contenteditable="false">' +
			'<iframe src="file:///a.pdf"></iframe>' +
			'<a href="file:///a.pdf" data-joplin-pdf-hidden="true" style="display:none">a.pdf</a>' +
			'</div>',
		);
		embedPdfLinks(editor);
		const wrappers = editor.dom.doc.querySelectorAll('.joplin-pdf-embed-wrapper');
		expect(wrappers.length).toBe(1);
	});

	test('embedPdfLinks: leaves non-PDF links untouched', () => {
		const original = '<p><a href="file:///image.png">image</a></p>';
		const editor = createMockEditor(original);
		embedPdfLinks(editor);
		expect(editor.dom.doc.body.innerHTML).toBe(original);
	});

	test('embedPdfLinks: replaces a PDF link that is the sole child of <h2> and stores restore-tag', () => {
		const editor = createMockEditor('<h2><a href="file:///a.pdf">a.pdf</a></h2>');
		embedPdfLinks(editor);
		expect(editor.dom.doc.querySelector('h2')).toBeNull();
		const wrapper = editor.dom.doc.querySelector('.joplin-pdf-embed-wrapper');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute('data-joplin-restore-tag')).toBe('h2');
	});

	test('embedPdfLinks: sets iframe src to a joplin-content:// URL for file:// links', () => {
		const editor = createMockEditor('<p><a href="file:///path/to/a.pdf">a.pdf</a></p>');
		embedPdfLinks(editor);
		const iframe = editor.dom.doc.querySelector<HTMLIFrameElement>('iframe');
		expect(iframe?.getAttribute('src')).toBe('joplin-content://note-viewer/path/to/a.pdf');
	});

	test('embedPdfLinks: preserves non-file:// links in iframe src unchanged', () => {
		const editor = createMockEditor('<p><a href="joplin-content://note-viewer/path/to/a.pdf">a.pdf</a></p>');
		embedPdfLinks(editor);
		const iframe = editor.dom.doc.querySelector<HTMLIFrameElement>('iframe');
		expect(iframe?.getAttribute('src')).toBe('joplin-content://note-viewer/path/to/a.pdf');
	});

	test('ensureTrailingEditableParagraph: appends a sentinel <p> when the last element is a joplin-editable block', () => {
		const editor = createMockEditor(
			'<div class="joplin-editable joplin-pdf-embed-wrapper" contenteditable="false"></div>',
		);
		ensureTrailingEditableParagraph(editor);
		const last = editor.dom.doc.body.lastElementChild;
		expect(last?.tagName).toBe('P');
		expect(last?.getAttribute('data-joplin-cursor-spacer')).toBe('true');
	});

	test('ensureTrailingEditableParagraph: appends a sentinel <p> when the wrapper is the last child of a block element', () => {
		const editor = createMockEditor('');
		const doc = editor.dom.doc;
		const p = doc.createElement('p');
		p.appendChild(doc.createTextNode('Some text'));
		p.appendChild(doc.createElement('br'));
		const wrapper = doc.createElement('div');
		wrapper.className = 'joplin-editable joplin-pdf-embed-wrapper';
		wrapper.setAttribute('contenteditable', 'false');
		p.appendChild(wrapper);
		doc.body.appendChild(p);

		ensureTrailingEditableParagraph(editor);
		const last = doc.body.lastElementChild;
		expect(last?.tagName).toBe('P');
		expect(last?.getAttribute('data-joplin-cursor-spacer')).toBe('true');
	});

	test('ensureTrailingEditableParagraph: does nothing when the last element is already editable', () => {
		const editor = createMockEditor('<p>Some text</p>');
		ensureTrailingEditableParagraph(editor);
		expect(editor.dom.doc.body.children.length).toBe(1);
	});

	test('ensureTrailingEditableParagraph: does nothing on an empty body', () => {
		const editor = createMockEditor('');
		ensureTrailingEditableParagraph(editor);
		expect(editor.dom.doc.body.children.length).toBe(0);
	});

	test('restorePdfEmbedsToLinks: restores a block wrapper to its original tag', () => {
		const input =
			'<div class="joplin-pdf-embed-wrapper" data-joplin-restore-tag="p">' +
			'<iframe src="file:///a.pdf"></iframe>' +
			'<a href="file:///a.pdf" data-joplin-pdf-hidden="true" style="display:none">a.pdf</a>' +
			'</div>';
		const result = restorePdfEmbedsToLinks(input);
		const doc = new DOMParser().parseFromString(result, 'text/html');
		expect(doc.querySelector('.joplin-pdf-embed-wrapper')).toBeNull();
		const anchor = doc.querySelector<HTMLAnchorElement>('p > a');
		expect(anchor).not.toBeNull();
		expect(anchor?.getAttribute('href')).toBe('file:///a.pdf');
		expect(anchor?.hasAttribute('data-joplin-pdf-hidden')).toBe(false);
		expect(anchor?.style.display).toBe('');
	});

	test('restorePdfEmbedsToLinks: restores an h2 wrapper back to <h2>', () => {
		const input =
			'<div class="joplin-pdf-embed-wrapper" data-joplin-restore-tag="h2">' +
			'<iframe src="file:///a.pdf"></iframe>' +
			'<a href="file:///a.pdf" data-joplin-pdf-hidden="true" style="display:none">a.pdf</a>' +
			'</div>';
		const result = restorePdfEmbedsToLinks(input);
		const doc = new DOMParser().parseFromString(result, 'text/html');
		expect(doc.querySelector('.joplin-pdf-embed-wrapper')).toBeNull();
		const anchor = doc.querySelector<HTMLAnchorElement>('h2 > a');
		expect(anchor).not.toBeNull();
		expect(anchor?.getAttribute('href')).toBe('file:///a.pdf');
	});

	test('restorePdfEmbedsToLinks: restores an inline wrapper back to a bare anchor', () => {
		const input =
			'<p>See </p>' +
			'<div class="joplin-pdf-embed-wrapper" data-joplin-restore-tag="inline">' +
			'<iframe src="file:///a.pdf"></iframe>' +
			'<a href="file:///a.pdf" data-joplin-pdf-hidden="true" style="display:none">a.pdf</a>' +
			'</div>' +
			'<p> here</p>';
		const result = restorePdfEmbedsToLinks(input);
		const doc = new DOMParser().parseFromString(result, 'text/html');
		expect(doc.querySelector('.joplin-pdf-embed-wrapper')).toBeNull();
		// The anchor replaces the wrapper in-place — it becomes a direct body child.
		const anchor = doc.querySelector<HTMLAnchorElement>('body > a');
		expect(anchor).not.toBeNull();
		expect(anchor?.getAttribute('href')).toBe('file:///a.pdf');
	});

	test('restorePdfEmbedsToLinks: removes an empty cursor-spacer paragraph', () => {
		const result = restorePdfEmbedsToLinks('<p data-joplin-cursor-spacer="true"><br></p>');
		const doc = new DOMParser().parseFromString(result, 'text/html');
		expect(doc.querySelector('[data-joplin-cursor-spacer]')).toBeNull();
		expect(doc.body.innerHTML.trim()).toBe('');
	});

	test('restorePdfEmbedsToLinks: keeps a spacer paragraph that has user content, stripping only the attribute', () => {
		const result = restorePdfEmbedsToLinks(
			'<p data-joplin-cursor-spacer="true">User typed this</p>',
		);
		const doc = new DOMParser().parseFromString(result, 'text/html');
		expect(doc.querySelector('[data-joplin-cursor-spacer]')).toBeNull();
		expect(doc.body.textContent).toContain('User typed this');
	});

	test('restorePdfEmbedsToLinks: leaves unrelated HTML unchanged', () => {
		const input = '<p>Hello <strong>world</strong></p>';
		expect(restorePdfEmbedsToLinks(input)).toBe(input);
	});

	test('restorePdfEmbedsToLinks: preserves original inline styles on the anchor when restoring', () => {
		const input =
			'<div class="joplin-pdf-embed-wrapper" data-joplin-restore-tag="p">' +
			'<iframe src="file:///a.pdf"></iframe>' +
			'<a href="file:///a.pdf" data-joplin-pdf-hidden="true" style="color:red;display:none">a.pdf</a>' +
			'</div>';
		const result = restorePdfEmbedsToLinks(input);
		const doc = new DOMParser().parseFromString(result, 'text/html');
		const anchor = doc.querySelector<HTMLAnchorElement>('a');
		expect(anchor?.style.color).toBe('red');
		expect(anchor?.style.display).toBe('');
	});
});
