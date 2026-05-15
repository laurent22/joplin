import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import createTestEditor from '../../testing/createTestEditor';
import renderTables, { renderInlineMarkdown } from './renderTables';

const createEditor = async (initialMarkdown: string) => {
	return await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		['TableHeader'],
		[renderTables],
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
});
