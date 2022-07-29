/**
 * @jest-environment jsdom
 */

import { EditorSelection, EditorState, SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	toggleCode, toggleMath, updateLink,
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

describe('markdownCommands, toggling twice', () => {
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
});

