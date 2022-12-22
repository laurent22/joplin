/**
 * @jest-environment jsdom
 */

import { EditorSelection, EditorState, SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	toggleBolded, toggleCode, toggleHeaderLevel, toggleItalicized, toggleMath, updateLink,
} from './markdownCommands';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { markdown } from '@codemirror/lang-markdown';
import { MarkdownMathExtension } from './markdownMathParser';
import { indentUnit } from '@codemirror/language';

// Creates and returns a minimal editor with markdown extensions
const createEditor = (initialText: string, initialSelection: SelectionRange): EditorView => {
	return new EditorView({
		doc: initialText,
		selection: EditorSelection.create([initialSelection]),
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
			indentUnit.of('\t'),
			EditorState.tabSize.of(4),
		],
	});
};

describe('markdownCommands', () => {
	it('should bold/italicize everything selected', () => {
		const initialDocText = 'Testing...';
		const editor = createEditor(
			initialDocText, EditorSelection.range(0, initialDocText.length)
		);

		toggleBolded(editor);

		let mainSel = editor.state.selection.main;
		const boldedText = '**Testing...**';
		expect(editor.state.doc.toString()).toBe(boldedText);
		expect(mainSel.from).toBe(0);
		expect(mainSel.to).toBe(boldedText.length);

		toggleBolded(editor);
		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toBe(initialDocText);
		expect(mainSel.from).toBe(0);
		expect(mainSel.to).toBe(initialDocText.length);

		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toBe('*Testing...*');

		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toBe('Testing...');
	});

	it('for a cursor, bolding, then italicizing, should produce a bold-italic region', () => {
		const initialDocText = '';
		const editor = createEditor(
			initialDocText, EditorSelection.cursor(0)
		);

		toggleBolded(editor);
		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toBe('******');

		editor.dispatch(editor.state.replaceSelection('Test'));
		expect(editor.state.doc.toString()).toBe('***Test***');

		toggleItalicized(editor);
		editor.dispatch(editor.state.replaceSelection(' Test'));
		expect(editor.state.doc.toString()).toBe('***Test*** Test');
	});

	it('toggling math should both create and navigate out of math regions', () => {
		const initialDocText = 'Testing... ';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleMath(editor);
		expect(editor.state.doc.toString()).toBe('Testing... $$');
		expect(editor.state.selection.main.empty).toBe(true);

		editor.dispatch(editor.state.replaceSelection('3 + 3 \\neq 5'));
		expect(editor.state.doc.toString()).toBe('Testing... $3 + 3 \\neq 5$');

		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('...'));
		expect(editor.state.doc.toString()).toBe('Testing... $3 + 3 \\neq 5$...');
	});

	it('toggling inline code should both create and navigate out of an inline code region', () => {
		const initialDocText = 'Testing...\n\n';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		toggleCode(editor);

		editor.dispatch(editor.state.replaceSelection(' is a function.'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n`f(x) = ...` is a function.');
	});

	it('should set headers to the proper levels (when toggling)', () => {
		const initialDocText = 'Testing...\nThis is a test.';
		const editor = createEditor(initialDocText, EditorSelection.cursor(3));

		toggleHeaderLevel(1)(editor);

		let mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toBe('# Testing...\nThis is a test.');
		expect(mainSel.empty).toBe(true);
		expect(mainSel.from).toBe('# Testing...'.length);

		toggleHeaderLevel(2)(editor);

		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toBe('## Testing...\nThis is a test.');
		expect(mainSel.empty).toBe(true);
		expect(mainSel.from).toBe('## Testing...'.length);

		toggleHeaderLevel(2)(editor);

		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(initialDocText);
		expect(mainSel.empty).toBe(true);
		expect(mainSel.from).toBe('Testing...'.length);
	});

	it('headers should toggle properly within block quotes', () => {
		const initialDocText = 'Testing...\n\n> This is a test.\n> ...a test';
		const editor = createEditor(
			initialDocText,
			EditorSelection.cursor('Testing...\n\n> This'.length)
		);

		toggleHeaderLevel(1)(editor);

		const mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toBe(
			'Testing...\n\n> # This is a test.\n> ...a test'
		);
		expect(mainSel.empty).toBe(true);
		expect(mainSel.from).toBe('Testing...\n\n> # This is a test.'.length);

		toggleHeaderLevel(3)(editor);

		expect(editor.state.doc.toString()).toBe(
			'Testing...\n\n> ### This is a test.\n> ...a test'
		);
	});

	it('block math should properly toggle within block quotes', () => {
		const initialDocText = 'Testing...\n\n> This is a test.\n> y = mx + b\n> ...a test';
		const editor = createEditor(
			initialDocText,
			EditorSelection.range(
				'Testing...\n\n> This'.length,
				'Testing...\n\n> This is a test.\n> y = mx + b'.length
			)
		);

		toggleMath(editor);

		// Toggling math should surround the content in '$$'s
		let mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(
			'Testing...\n\n> $$\n> This is a test.\n> y = mx + b\n> $$\n> ...a test'
		);
		expect(mainSel.from).toBe('Testing...\n\n'.length);
		expect(mainSel.to).toBe('Testing...\n\n> $$\n> This is a test.\n> y = mx + b\n> $$'.length);

		// Change to a cursor --- test cursor expansion
		editor.dispatch({
			selection: EditorSelection.cursor('Testing...\n\n> $$\n> This is'.length),
		});

		// Toggling math again should remove the '$$'s
		toggleMath(editor);
		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(initialDocText);
		expect(mainSel.from).toBe('Testing...\n\n'.length);
		expect(mainSel.to).toBe('Testing...\n\n> This is a test.\n> y = mx + b'.length);
	});

	it('updateLink should replace link titles and isolate URLs if no title is given', () => {
		const initialDocText = '[foo](http://example.com/)';
		const editor = createEditor(initialDocText, EditorSelection.cursor('[f'.length));

		updateLink('bar', 'https://example.com/')(editor);
		expect(editor.state.doc.toString()).toBe(
			'[bar](https://example.com/)'
		);

		updateLink('', 'https://example.com/')(editor);
		expect(editor.state.doc.toString()).toBe(
			'https://example.com/'
		);
	});

	it('toggling math twice, starting on a line with content, should a math block', () => {
		const initialDocText = 'Testing... ';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing... \n$$\nf(x) = ...\n$$');
	});

	it('toggling math twice on an empty line should create an empty math block', () => {
		const initialDocText = 'Testing...\n\n';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n$$\nf(x) = ...\n$$');
	});

	it('toggling code twice on an empty line should create an empty code block', () => {
		const initialDocText = 'Testing...\n\n';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		// Toggling code twice should create a block code region
		toggleCode(editor);
		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n```\nf(x) = ...\n```');

		toggleCode(editor);
		expect(editor.state.doc.toString()).toBe('Testing...\n\nf(x) = ...\n');
	});

	it('toggling math twice inside a block quote should produce an empty math block', () => {
		const initialDocText = '> Testing...> \n> ';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe(
			'> Testing...> \n> \n> $$\n> f(x) = ...\n> $$'
		);

		// If we toggle math again, everything from the start of the line with the first
		// $$ to the end of the document should be selected.
		toggleMath(editor);
		const sel = editor.state.selection.main;
		expect(sel.from).toBe('> Testing...> \n> \n'.length);
		expect(sel.to).toBe(editor.state.doc.length);
	});

	it('toggling inline code should both create and navigate out of an inline code region', () => {
		const initialDocText = 'Testing...\n\n';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		toggleCode(editor);

		editor.dispatch(editor.state.replaceSelection(' is a function.'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n`f(x) = ...` is a function.');
	});
});

