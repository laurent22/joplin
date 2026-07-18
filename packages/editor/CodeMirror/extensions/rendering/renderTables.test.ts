import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import createTestEditor from '../../testing/createTestEditor';
import renderTables, { renderInlineMarkdown } from './renderTables';
import { RenderedContentContext } from './types';

const createEditor = async (initialMarkdown: string, context?: Partial<RenderedContentContext>) => {
	const fullContext: RenderedContentContext = {
		resolveImageSrc: async () => '',
		openLink: () => {},
		...context,
	};
	return await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		['TableHeader'],
		[renderTables(fullContext)],
	);
};

const findCellTextDivs = (editor: EditorView) => {
	return editor.dom.querySelectorAll<HTMLElement>('.cm-tw-text');
};

const focusCell = (cell: HTMLElement) => {
	cell.dispatchEvent(new Event('focus'));
};

describe('renderTables', () => {
	test.each([
		{ input: 'plain text', expected: 'plain text', inner: '' },
		{ input: '**bold**', expected: 'bold', inner: '<strong>bold</strong>' },
		{ input: '__bold__', expected: 'bold', inner: '<strong>bold</strong>' },
		{ input: '*italic*', expected: 'italic', inner: '<em>italic</em>' },
		{ input: '_italic_', expected: 'italic', inner: '<em>italic</em>' },
		{ input: '`code`', expected: 'code', inner: '<code>code</code>' },
		{ input: '~~strike~~', expected: 'strike', inner: '<del>strike</del>' },
		{ input: '[label](https://example.com)', expected: 'label', inner: '<a href="https://example.com">label</a>' },
		{ input: 'a **b** c', expected: 'a b c', inner: 'a <strong>b</strong> c' },
		// Escaped pipes are unescaped for display.
		{ input: 'a \\| b', expected: 'a | b', inner: 'a | b' },
	])('renderInlineMarkdown should render $input', ({ input, expected, inner }) => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, input);
		expect(div.textContent).toBe(expected);
		if (inner) expect(div.innerHTML).toBe(inner);
	});

	test.each([
		'foo_bar_baz',
		'my_var_name',
		'a*b*c',
		'snake_case_identifier',
	])('renderInlineMarkdown should not treat intra-word * or _ as emphasis: %s', (input) => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, input);
		expect(div.querySelector('em')).toBeNull();
		expect(div.textContent).toBe(input);
	});

	test('renderInlineMarkdown should treat literal <br> as a line break', () => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, 'line1<br>line2');
		expect(div.querySelectorAll('br')).toHaveLength(1);
		expect(div.textContent).toBe('line1line2');
	});

	test('renderInlineMarkdown should not let raw HTML through', () => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, '<script>alert(1)</script>');
		expect(div.querySelector('script')).toBeNull();
		expect(div.textContent).toBe('<script>alert(1)</script>');
	});

	test.each([
		'[click](javascript:alert(1))',
		'[click](JavaScript:alert(1))',
		'[click](data:text/html,<script>alert(1)</script>)',
		'[click](vbscript:msgbox)',
	])('renderInlineMarkdown should strip dangerous href schemes: %s', (input) => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, input);
		// DOMPurify may keep the anchor element but must remove the unsafe
		// href so clicking it does nothing.
		const anchor = div.querySelector('a');
		expect(anchor?.getAttribute('href')).toBeFalsy();
		// And nothing executable should have leaked in.
		expect(div.querySelector('script')).toBeNull();
	});

	test.each([
		{ url: 'https://example.com', expected: 'https://example.com' },
		{ url: 'http://example.com', expected: 'http://example.com' },
		{ url: 'mailto:test@example.com', expected: 'mailto:test@example.com' },
		{ url: '/relative/path', expected: '/relative/path' },
		{ url: ':/abc1234567890def', expected: ':/abc1234567890def' },
	])('renderInlineMarkdown should produce anchors for safe URLs: $url', ({ url, expected }) => {
		const div = document.createElement('div');
		renderInlineMarkdown(div, `[label](${url})`);
		const a = div.querySelector('a');
		expect(a).not.toBeNull();
		expect(a!.getAttribute('href')).toBe(expected);
	});

	test('cells should render inline markdown when not focused', async () => {
		const editor = await createEditor('| **bold** | *italic* |\n|---|---|\n| `code` | plain |');
		const cells = findCellTextDivs(editor);
		// 2 header cells + 2 body cells
		expect(cells).toHaveLength(4);
		expect(cells[0].querySelector('strong')?.textContent).toBe('bold');
		expect(cells[1].querySelector('em')?.textContent).toBe('italic');
		expect(cells[2].querySelector('code')?.textContent).toBe('code');
		expect(cells[3].textContent).toBe('plain');
	});

	test('focusing a cell should swap rendered DOM for raw markdown source', async () => {
		const editor = await createEditor('| **bold** | b |\n|---|---|\n| x | y |');
		const cells = findCellTextDivs(editor);
		// Sanity: rendered first.
		expect(cells[0].querySelector('strong')).not.toBeNull();
		focusCell(cells[0]);
		// After focus the cell should show the raw markdown text, no <strong>.
		expect(cells[0].querySelector('strong')).toBeNull();
		expect(cells[0].textContent).toBe('**bold**');
	});

	test('cells should preserve markdown source in the underlying document', async () => {
		// After mounting, the document source should be unchanged — the widget
		// must not rewrite the markdown just because cells render formatting.
		const source = '| **bold** | b |\n|---|---|\n| x | y |';
		const editor = await createEditor(source);
		expect(editor.state.doc.toString()).toBe(source);
	});

	test('ctrl/cmd-clicking a rendered cell link should open it', async () => {
		const opened: string[] = [];
		const editor = await createEditor(
			'| [label](https://example.com) | b |\n|---|---|\n| x | y |',
			{ openLink: (link) => opened.push(link) },
		);
		const anchor = editor.dom.querySelector<HTMLAnchorElement>('.cm-tw-text a[href]');
		expect(anchor).not.toBeNull();

		// A plain click should not open the link (it focuses the cell for editing).
		anchor!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(opened).toEqual([]);

		// Ctrl/Cmd-click opens it, matching the editor's normal link behaviour.
		anchor!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, ctrlKey: true }));
		expect(opened).toEqual(['https://example.com']);
	});

	test('holding the modifier over a link should show the pointer cursor', async () => {
		const editor = await createEditor('| [label](https://example.com) | b |\n|---|---|\n| x | y |');
		const container = editor.dom.querySelector<HTMLElement>('.cm-tw')!;
		const anchor = editor.dom.querySelector<HTMLAnchorElement>('.cm-tw-text a[href]')!;

		// Without the modifier, no pointer cursor.
		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(false);

		// With the modifier held over the link, the class is added.
		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ctrlKey: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(true);

		// Releasing the modifier removes it again.
		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(false);
	});

});
