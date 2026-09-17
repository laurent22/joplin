import { EditorSelection, EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import createTestEditor from '../../testing/createTestEditor';
import renderTables, { renderInlineMarkdown } from './renderTables';
import { RenderedContentContext } from './types';

const createEditor = async (initialMarkdown: string, context?: Partial<RenderedContentContext>, readOnly = false, extraExtensions: Extension[] = []) => {
	const fullContext: RenderedContentContext = {
		resolveImageSrc: async () => '',
		openLink: () => {},
		...context,
	};
	return await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		['TableHeader'],
		[EditorState.readOnly.of(readOnly), renderTables(fullContext), extraExtensions],
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

	test('table editing controls should be hidden when read-only', async () => {
		const editor = await createEditor('| A | B |\n|---|---|\n| C | D |', undefined, true);
		const cells = findCellTextDivs(editor);
		expect([...cells].every(cell => cell.contentEditable === 'false')).toBe(true);
		expect(editor.dom.querySelector('.cm-tw-ac-wrap, .cm-tw-ar-wrap')).toBeNull();

		cells[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		expect(editor.dom.querySelector('.cm-tw-ctx')).toBeNull();
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

		anchor!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(opened).toEqual([]);

		anchor!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, ctrlKey: true }));
		expect(opened).toEqual(['https://example.com']);
	});

	test('holding the modifier over a link should show the pointer cursor', async () => {
		const editor = await createEditor('| [label](https://example.com) | b |\n|---|---|\n| x | y |');
		const container = editor.dom.querySelector<HTMLElement>('.cm-tw')!;
		const anchor = editor.dom.querySelector<HTMLAnchorElement>('.cm-tw-text a[href]')!;

		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(false);

		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, ctrlKey: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(true);

		anchor.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		expect(container.classList.contains('cm-tw-mod-link')).toBe(false);
	});

	test.each([
		{ row: 0, col: 0, content: 'Header' },
		{ row: 20, col: 0, content: 'Row 20' },
		{ row: 40, col: 1, content: 'Value 40' },
	])('document coordinates should point to cell ($row, $col)', async ({ row, col, content }) => {
		const markdown = [
			'Before', '', '| Header | Value |', '| --- | --- |',
			...Array.from({ length: 60 }, (_, index) => `| Row ${index + 1} | Value ${index + 1} |`),
			'', 'After',
		].join('\n');
		const editor = await createEditor(markdown);
		try {
			const cell = findCellTextDivs(editor)[row * 2 + col];
			const rect = {
				x: 50, y: 300, left: 50, top: 300, right: 150, bottom: 330,
				width: 100, height: 30, toJSON: () => ({}),
			};
			jest.spyOn(cell, 'getBoundingClientRect').mockReturnValue(rect);
			const coords = editor.coordsAtPos(markdown.indexOf(content) + 1);
			expect(coords?.top).toBe(rect.top);
			expect(coords?.bottom).toBe(rect.bottom);
		} finally {
			editor.destroy();
		}
	});

	test('undo and redo should keep the document selection in the edited cell', async () => {
		jest.useFakeTimers();
		let editor: EditorView | null = null;
		try {
			editor = await createEditor('| Head | Other |\n| ---- | ----- |\n| A    | B     |', undefined, false, [history()]);
			document.body.appendChild(editor.dom);
			const cell = findCellTextDivs(editor)[3];
			focusCell(cell);
			cell.textContent = 'Changed';
			cell.dispatchEvent(new Event('input'));
			await jest.advanceTimersByTimeAsync(600);

			const editedPosition = editor.state.doc.toString().indexOf('Changed');
			expect(editor.state.selection.main.head).toBe(editedPosition);
			focusCell(findCellTextDivs(editor)[3]);
			expect(undo(editor)).toBe(true);
			// Inspect the history selection before DOM focus can overwrite it.
			expect(editor.state.selection.main.head).toBe(editor.state.doc.toString().indexOf('B'));
			expect(redo(editor)).toBe(true);
			expect(editor.state.selection.main.head).toBe(editedPosition);
			await jest.advanceTimersByTimeAsync(600);
			expect(findCellTextDivs(editor)[3].textContent).toBe('Changed');
		} finally {
			editor?.destroy();
			editor?.dom.remove();
			await jest.advanceTimersByTimeAsync(100);
			jest.useRealTimers();
		}
	});

	test('typing a trailing space in a cell should keep it visible after live-sync', async () => {
		jest.useFakeTimers();
		let editor: EditorView | null = null;
		try {
			editor = await createEditor('| Head | b |\n|---|---|\n| x | y |');
			// The widget must be connected for the live-sync flush to run.
			document.body.appendChild(editor.dom);

			const cell = findCellTextDivs(editor)[0];
			focusCell(cell);

			cell.textContent = 'Hello ';
			cell.dispatchEvent(new Event('input'));

			// Fire the 500ms debounced live-sync and the follow-up rAF that
			// restores focus + caret to the rebuilt cell.
			jest.advanceTimersByTime(600);
			jest.runOnlyPendingTimers();

			// The rebuilt-and-refocused cell must still show the trailing space
			// rather than the markdown-trimmed "Hello".
			const refocused = findCellTextDivs(editor)[0];
			expect(refocused.textContent).toBe('Hello ');
		} finally {
			editor?.destroy();
			jest.useRealTimers();
		}
	});

});
