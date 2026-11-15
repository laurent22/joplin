import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import createTestEditor from '../../../testing/createTestEditor';
import visibleEditorText from '../../../testing/visibleEditorText';
import replaceFormatCharacters from '../replaceFormatCharacters';
import replaceLinks from '../replaceLinks';
import replaceInlineHtml from '../replaceInlineHtml';
import replaceBackslashEscapes from '../replaceBackslashEscapes';
import renderingExtension from '../renderingExtension';
import renderedSelection, { hiddenSyntaxFacet } from './renderedSelection';

const mouseDown = (editor: EditorView) => editor.dom.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
const mouseUp = (editor: EditorView) => editor.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

const extensions = [replaceFormatCharacters, replaceLinks, replaceInlineHtml, replaceBackslashEscapes];
const createEditor = (markdown = 'This is **bold** text\n\nAway') => createTestEditor(
	markdown, EditorSelection.cursor(markdown.length), [], extensions,
);

describe('renderedSelection', () => {
	beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
	afterEach(() => jest.useRealTimers());

	it.each([
		{ markdown: 'This is **bold** text', from: 0, to: 12, expected: 'This is **bo' },
		{ markdown: '**one***two*', from: 2, to: 5, expected: '**one**' },
		{ markdown: '**one***two*', from: 8, to: 11, expected: '*two*' },
		{ markdown: '**one***two*', from: 5, to: 12, expected: '*two*' },
		{ markdown: '# **Heading**', from: 4, to: 11, expected: '# **Heading**' },
		{ markdown: '# Heading text', from: 2, to: 9, expected: 'Heading' },
		{ markdown: '[**bold**](https://example.com)', from: 3, to: 7, expected: '[**bold**](https://example.com)' },
		{ markdown: '[one](https://example.com)[two](https://example.org)', from: 1, to: 4, expected: '[one](https://example.com)' },
		{ markdown: '[one](https://example.com)', from: 2, to: 4, expected: 'ne' },
		// Reference labels are currently visible: selecting only "one" must not add "ref".
		{ markdown: '[one][ref]\n\n[ref]: https://example.com', from: 1, to: 4, expected: 'one' },
		{ markdown: '[one][missing]', from: 1, to: 4, expected: 'one' },
		{ markdown: '<sup>**bold**</sup>', from: 7, to: 11, expected: '<sup>**bold**</sup>' },
		{ markdown: '`code`', from: 1, to: 5, expected: '`code`' },
		{ markdown: '```txt\ncode\n```', from: 3, to: 15, expected: '```txt\ncode\n```' },
		{ markdown: '```txt\ncode\n```', from: 7, to: 11, expected: 'code' },
		{ markdown: '~~strike~~', from: 2, to: 8, expected: '~~strike~~' },
	])('should select "$expected" from "$markdown" in both directions', async ({ markdown, from, to, expected }) => {
		for (const backward of [false, true]) {
			const editor = await createEditor(`${markdown}\n\nAway`);
			try {
				const selection = EditorSelection.range(backward ? to : from, backward ? from : to);
				mouseDown(editor);
				editor.dispatch({ selection, userEvent: 'select.pointer' });
				const beforeMouseUp = visibleEditorText(editor);
				expect(editor.state.selection.main.eq(selection)).toBe(true);
				mouseUp(editor);
				// Normalization and syntax revelation both wait until the gesture ends.
				expect(visibleEditorText(editor)).toBe(beforeMouseUp);
				expect(editor.state.selection.main.eq(selection)).toBe(true);
				await jest.runAllTimersAsync();
				const result = editor.state.selection.main;
				expect(editor.state.sliceDoc(result.from, result.to)).toBe(expected);
				expect(result.anchor > result.head).toBe(backward);
			} finally {
				editor.destroy();
			}
		}
	});

	it('should complete all ranges and reveal syntax with just one mouseup transaction', async () => {
		let transactionCount = 0;
		const markdown = '**one** and *two*\n\nAway';
		const editor = await createTestEditor(markdown, EditorSelection.cursor(markdown.length), [], [
			extensions,
			EditorView.updateListener.of(update => { transactionCount += update.transactions.length; }),
		]);
		try {
			mouseDown(editor);
			editor.dispatch({ selection: EditorSelection.create([
				EditorSelection.range(2, 5), EditorSelection.range(16, 13),
			], 1), userEvent: 'select.pointer' });
			transactionCount = 0;
			mouseUp(editor);
			await jest.runAllTimersAsync();
			expect(transactionCount).toBe(1);
			expect(editor.state.selection.mainIndex).toBe(1);
			expect(editor.state.selection.ranges[0]).toMatchObject({ anchor: 0, head: 7 });
			expect(editor.state.selection.ranges[1]).toMatchObject({ anchor: 17, head: 12 });
		} finally {
			editor.destroy();
		}
	});

	it.each(['keyboard', 'programmatic', 'visible syntax', 'no'])('should leave rendering and selection unchanged after %s selection', async kind => {
		const editor = await createEditor();
		try {
			if (kind === 'visible syntax') {
				editor.dispatch({ selection: { anchor: 12 } });
			}
			const text = visibleEditorText(editor);
			mouseDown(editor);
			if (kind !== 'no') {
				editor.dispatch({ selection: EditorSelection.range(10, 14), userEvent: kind === 'visible syntax' ? 'select.pointer' : kind === 'keyboard' ? 'select' : undefined });
			}
			const selection = editor.state.selection;
			mouseUp(editor);
			await jest.runAllTimersAsync();
			expect(editor.state.selection.eq(selection)).toBe(true);
			if (kind === 'no') expect(visibleEditorText(editor)).toBe(text);
		} finally {
			editor.destroy();
		}
	});

	it.each(['selection', 'document', 'new gesture', 'destroy'])('should cancel a pending completion after %s changes', async kind => {
		const editor = await createEditor();
		try {
			mouseDown(editor);
			editor.dispatch({ selection: EditorSelection.range(10, 14), userEvent: 'select.pointer' });
			mouseUp(editor);
			if (kind === 'selection') editor.dispatch({ selection: { anchor: 14 } });
			if (kind === 'document') editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'new' } });
			if (kind === 'new gesture') mouseDown(editor);
			if (kind === 'destroy') editor.destroy();
			const expectedSelection = editor.state.selection;
			await jest.runAllTimersAsync();
			expect(editor.state.selection.eq(expectedSelection)).toBe(true);
		} finally {
			editor.destroy();
		}
	});

	it('should keep the anchor\'s hidden syntax after a drag scrolls it out of the viewport', async () => {
		let visibleSyntax = [
			{ from: 0, to: 2, ownerFrom: 0, ownerTo: 7 },
			{ from: 5, to: 7, ownerFrom: 0, ownerTo: 7 },
		];
		const editor = await createTestEditor('**one**\n\n*two*\n\nAway', EditorSelection.cursor(19), [], [
			renderedSelection, hiddenSyntaxFacet.of(() => visibleSyntax),
		]);
		try {
			mouseDown(editor);
			visibleSyntax = [
				{ from: 9, to: 10, ownerFrom: 9, ownerTo: 14 },
				{ from: 13, to: 14, ownerFrom: 9, ownerTo: 14 },
			];
			editor.dispatch({ selection: EditorSelection.range(2, 13), userEvent: 'select.pointer' });
			mouseUp(editor);
			await jest.runAllTimersAsync();
			expect(editor.state.selection.main).toMatchObject({ anchor: 0, head: 14 });
		} finally {
			editor.destroy();
		}
	});

	it('should leave a caret after a rendered link in a task list', async () => {
		const markdown = '- [ ] [link](https://example.com)\n\nAway';
		const editor = await createTestEditor(markdown, EditorSelection.cursor(markdown.length), [], [renderingExtension({
			resolveImageSrc: async () => '', openLink: () => {},
		}, false)]);
		try {
			const position = markdown.indexOf('\n');
			mouseDown(editor);
			editor.dispatch({ selection: { anchor: position }, userEvent: 'select.pointer' });
			mouseUp(editor);
			await jest.runAllTimersAsync();
			expect(editor.state.selection.main).toMatchObject({ anchor: position, head: position });
		} finally {
			editor.destroy();
		}
	});
});
