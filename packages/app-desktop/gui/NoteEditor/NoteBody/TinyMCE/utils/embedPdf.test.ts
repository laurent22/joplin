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
	describe('isPdfUrl', () => {
		test('detects a simple file:// PDF URL', () => {
			expect(isPdfUrl('file:///path/to/file.pdf')).toBe(true);
		});

		test('is case-insensitive', () => {
			expect(isPdfUrl('file:///path/to/FILE.PDF')).toBe(true);
		});

		test('ignores query strings', () => {
			expect(isPdfUrl('file:///path/to/file.pdf?v=1')).toBe(true);
		});

		test('ignores fragments', () => {
			expect(isPdfUrl('file:///path/to/file.pdf#page=2')).toBe(true);
		});

		test('returns false for a non-PDF URL', () => {
			expect(isPdfUrl('file:///path/to/image.png')).toBe(false);
		});

		test('handles a relative path via fallback', () => {
			expect(isPdfUrl('documents/report.pdf')).toBe(true);
		});
	});

	describe('embedPdfLinks', () => {
		test('replaces a PDF link that is the sole child of <p> with a wrapper div', () => {
			const editor = createMockEditor('<p><a href="file:///a.pdf">a.pdf</a></p>');
			embedPdfLinks(editor);
			const body = editor.dom.doc.body;
			expect(body.querySelector('p')).toBeNull();
			const wrapper = body.querySelector('.joplin-pdf-embed-wrapper');
			expect(wrapper).not.toBeNull();
			expect(wrapper?.getAttribute('contenteditable')).toBe('false');
		});

		test('the wrapper contains a hidden anchor with original attributes', () => {
			const editor = createMockEditor('<p><a href="file:///a.pdf" title="My PDF">a.pdf</a></p>');
			embedPdfLinks(editor);
			const hidden = editor.dom.doc.querySelector<HTMLAnchorElement>('a[data-joplin-pdf-hidden]');
			expect(hidden).not.toBeNull();
			expect(hidden?.getAttribute('title')).toBe('My PDF');
			expect(hidden?.style.display).toBe('none');
		});

		test('replaces only the anchor when it has sibling text content', () => {
			const editor = createMockEditor('<p>See <a href="file:///a.pdf">a.pdf</a> here</p>');
			embedPdfLinks(editor);
			// The <p> must survive because it contains more than just the anchor.
			expect(editor.dom.doc.querySelector('p')).not.toBeNull();
			expect(editor.dom.doc.querySelector('.joplin-pdf-embed-wrapper')).not.toBeNull();
		});

		test('does not double-wrap an already-wrapped anchor', () => {
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

		test('leaves non-PDF links untouched', () => {
			const original = '<p><a href="file:///image.png">image</a></p>';
			const editor = createMockEditor(original);
			embedPdfLinks(editor);
			expect(editor.dom.doc.body.innerHTML).toBe(original);
		});

		test('replaces a PDF link that is the sole child of <h2>', () => {
			const editor = createMockEditor('<h2><a href="file:///a.pdf">a.pdf</a></h2>');
			embedPdfLinks(editor);
			expect(editor.dom.doc.querySelector('h2')).toBeNull();
			expect(editor.dom.doc.querySelector('.joplin-pdf-embed-wrapper')).not.toBeNull();
		});
	});

	describe('ensureTrailingEditableParagraph', () => {
		test('appends a sentinel <p> when the last element is a joplin-editable block', () => {
			const editor = createMockEditor(
				'<div class="joplin-editable joplin-pdf-embed-wrapper" contenteditable="false"></div>',
			);
			ensureTrailingEditableParagraph(editor);
			const last = editor.dom.doc.body.lastElementChild;
			expect(last?.tagName).toBe('P');
			expect(last?.getAttribute('data-joplin-cursor-spacer')).toBe('true');
		});

		test('does nothing when the last element is already editable', () => {
			const editor = createMockEditor('<p>Some text</p>');
			ensureTrailingEditableParagraph(editor);
			expect(editor.dom.doc.body.children.length).toBe(1);
		});

		test('does nothing on an empty body', () => {
			const editor = createMockEditor('');
			ensureTrailingEditableParagraph(editor);
			expect(editor.dom.doc.body.children.length).toBe(0);
		});
	});

	describe('restorePdfEmbedsToLinks', () => {
		test('replaces a wrapper with <p><a href="...">...</a></p>', () => {
			const input =
				'<div class="joplin-pdf-embed-wrapper">' +
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

		test('removes an empty cursor-spacer paragraph', () => {
			const result = restorePdfEmbedsToLinks('<p data-joplin-cursor-spacer="true"><br></p>');
			const doc = new DOMParser().parseFromString(result, 'text/html');
			expect(doc.querySelector('[data-joplin-cursor-spacer]')).toBeNull();
			expect(doc.body.innerHTML.trim()).toBe('');
		});

		test('keeps a spacer paragraph that has user content, stripping only the attribute', () => {
			const result = restorePdfEmbedsToLinks(
				'<p data-joplin-cursor-spacer="true">User typed this</p>',
			);
			const doc = new DOMParser().parseFromString(result, 'text/html');
			expect(doc.querySelector('[data-joplin-cursor-spacer]')).toBeNull();
			expect(doc.body.textContent).toContain('User typed this');
		});

		test('leaves unrelated HTML unchanged', () => {
			const input = '<p>Hello <strong>world</strong></p>';
			expect(restorePdfEmbedsToLinks(input)).toBe(input);
		});

		test('preserves original inline styles on the anchor when restoring', () => {
			const input =
				'<div class="joplin-pdf-embed-wrapper">' +
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
});
