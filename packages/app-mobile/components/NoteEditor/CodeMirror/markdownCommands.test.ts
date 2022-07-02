/**
 * @jest-environment jsdom
 */

import { EditorSelection, EditorState, SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { increaseIndent, toggleBolded, toggleCode, toggleHeaderLevel, toggleItalicized, toggleList, toggleMath, toggleRegionFormat, updateLink } from './markdownCommands';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { markdown } from '@codemirror/lang-markdown';
import { MarkdownMathExtension } from './markdownMathParser';
import RegionSpec from './RegionSpec';
import { ListType } from '../types';
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
		],
	});
};

describe('Formatting commands', () => {
	it('Bolding/italicizing (everything selected)', () => {
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
		expect(editor.state.doc.toString()).toBe('_Testing..._');

		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toBe('Testing...');
	});

	it('Creating/exiting a math region', () => {
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

	describe('Creating block regions by toggling twice', () => {
		it('Block math, line with text', () => {
			const initialDocText = 'Testing... ';
			const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

			toggleMath(editor);
			toggleMath(editor);
			editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
			expect(editor.state.doc.toString()).toBe('Testing... \n$$\nf(x) = ...\n$$');
		});

		it('Block math, empty line', () => {
			const initialDocText = 'Testing...\n\n';
			const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

			toggleMath(editor);
			toggleMath(editor);
			editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
			expect(editor.state.doc.toString()).toBe('Testing...\n\n$$\nf(x) = ...\n$$');
		});

		it('Block code, empty line', () => {
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

		it('Block math, inside block quote', () => {
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
	});

	it('Inline code, empty line', () => {
		const initialDocText = 'Testing...\n\n';
		const editor = createEditor(initialDocText, EditorSelection.cursor(initialDocText.length));

		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		toggleCode(editor);

		editor.dispatch(editor.state.replaceSelection(' is a function.'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n`f(x) = ...` is a function.');
	});

	it('Toggling header', () => {
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

	it('Toggling header (in block quote)', () => {
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

	it('Toggling math (in block quote)', () => {
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

	it('Changing list type', () => {
		const preSubListText = '# List test\n * This\n * is\n';
		const initialDocText = `${preSubListText}\t* a\n\t* test\n * of list toggling`;

		const editor = createEditor(
			initialDocText,
			EditorSelection.cursor(preSubListText.length + '\t* a'.length)
		);

		// Indentation should be preserved when changing list types
		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n * This\n * is\n\t1. a\n\t2. test\n * of list toggling'
		);

		// The changed region should be selected
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
		expect(editor.state.selection.main.to).toBe(
			'# List test\n * This\n * is\n\t1. a\n\t2. test'.length
		);

		// Indentation should not be preserved when removing lists
		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n * This\n * is\na\ntest\n * of list toggling'
		);


		// Put the cursor in the middle of the list
		editor.dispatch({ selection: EditorSelection.cursor(preSubListText.length) });

		// All non-empty lines in the list should change to the new type
		toggleList(ListType.CheckList)(editor);
		expect(editor.state.selection.main.from).toBe('# List test\n'.length);
		expect(editor.state.selection.main.to).toBe(editor.state.doc.length);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n - [ ] This\n - [ ] is\n- [ ] a\n- [ ] test\n - [ ] of list toggling'
		);

		editor.dispatch({ selection: EditorSelection.cursor(editor.state.doc.length) });
		editor.dispatch(editor.state.replaceSelection('\n\n\n'));

		// toggleList should also create a new list if the cursor is on an empty line.
		toggleList(ListType.OrderedList)(editor);
		editor.dispatch(editor.state.replaceSelection('Test.\n2. Test2\n3. Test3'));

		const expectedChecklistPart =
			'# List test\n - [ ] This\n - [ ] is\n- [ ] a\n- [ ] test\n - [ ] of list toggling';
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart}\n\n\n1. Test.\n2. Test2\n3. Test3`
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart}\n\n\n- [ ] Test.\n- [ ] Test2\n- [ ] Test3`
		);

		// The entire checklist should have been selected (and thus will now be indented)
		increaseIndent(editor);
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart}\n\n\n\t- [ ] Test.\n\t- [ ] Test2\n\t- [ ] Test3`
		);
	});

	it('Changing list type (in block quote)', () => {
		const preSubListText = '> # List test\n> * This\n> * is\n';
		const initialDocText = `${preSubListText}> \t* a\n> \t* test\n> * of list toggling`;
		const editor = createEditor(
			initialDocText, EditorSelection.cursor(preSubListText.length + 3)
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'> # List test\n> * This\n> * is\n> \t1. a\n> \t2. test\n> * of list toggling'
		);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
	});

	it('Updating a link', () => {
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

describe('Internal text manipulation', () => {
	const initialText = `Internal text manipulation
		This is a test...
		of block and inline region toggling.`;
	const codeFenceRegex = /^``````\w*\s*$/;
	const inlineCodeRegionSpec = new RegionSpec({
		templateStart: '`',
		templateStop: '`',
	});
	const codeTemplate = { start: '``````', stop: '``````' };

	it('Toggle inline region format', () => {
		const initialState: EditorState = EditorState.create({
			doc: initialText,
			selection: EditorSelection.cursor(0),
		});

		const changes = toggleRegionFormat(
			initialState,
			'InlineCode', inlineCodeRegionSpec,

			'FencedCode', { start: codeFenceRegex, stop: codeFenceRegex },
			codeTemplate
		);

		const newState = initialState.update(changes).state;
		expect(newState.doc.toString()).toEqual(`\`\`${initialText}`);
	});

	it('Toggle block region format', () => {
		const initialState: EditorState = EditorState.create({
			doc: initialText,
			selection: EditorSelection.range(0, initialText.length),
		});

		const changes = toggleRegionFormat(
			initialState,
			'InlineCode', inlineCodeRegionSpec,

			'FencedCode', { start: codeFenceRegex, stop: codeFenceRegex },
			codeTemplate
		);

		const newState = initialState.update(changes).state;
		const editorText = newState.doc.toString();
		expect(editorText).toBe(`\`\`\`\`\`\`\n${initialText}\n\`\`\`\`\`\``);
		expect(newState.selection.main.from).toBe(0);
		expect(newState.selection.main.to).toBe(editorText.length);
	});
});
