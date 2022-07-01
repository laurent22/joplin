/**
 * @jest-environment jsdom
 */

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { increaseIndent, toggleBolded, toggleHeaderLevel, toggleItalicized, toggleList, toggleMath, toggleRegionFormat } from './markdownCommands';
import { markdown } from '@codemirror/lang-markdown';
import { MarkdownMathExtension } from './markdownMathParser';
import RegionSpec from './RegionSpec';
import { ListType } from '../types';

describe('Formatting commands', () => {
	it('Bolding/italicizing (everything selected)', () => {
		const initialDocText = 'Testing...';
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([EditorSelection.range(0, initialDocText.length)]),
		});

		toggleBolded(editor);

		let mainSel = editor.state.selection.main;
		const boldedText = '**Testing...**';
		expect(editor.state.doc.toString()).toEqual(boldedText);
		expect(mainSel.from).toBe(0);
		expect(mainSel.to).toBe(boldedText.length);

		toggleBolded(editor);
		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(initialDocText);
		expect(mainSel.from).toBe(0);
		expect(mainSel.to).toBe(initialDocText.length);

		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toEqual('_Testing..._');

		toggleItalicized(editor);
		expect(editor.state.doc.toString()).toEqual('Testing...');
	});

	it('Creating/exiting a math region', () => {
		const initialDocText = 'Testing... ';
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([EditorSelection.cursor(initialDocText.length)]),
		});

		toggleMath(editor);
		expect(editor.state.doc.toString()).toEqual('Testing... $$');
		expect(editor.state.selection.main.empty).toBe(true);

		editor.dispatch(editor.state.replaceSelection('3 + 3 \\neq 5'));
		expect(editor.state.doc.toString()).toEqual('Testing... $3 + 3 \\neq 5$');

		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('...'));
		expect(editor.state.doc.toString()).toEqual('Testing... $3 + 3 \\neq 5$...');
	});

	it('Toggling header', () => {
		const initialDocText = 'Testing...\nThis is a test.';
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([EditorSelection.cursor(3)]),
		});

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
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create(
				[EditorSelection.cursor('Testing...\n\n> This'.length)]
			),
		});

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
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create(
				[EditorSelection.range(
					'Testing...\n\n> This'.length,
					'Testing...\n\n> This is a test.\n> y = mx + b'.length
				)]
			),

			// Include the math extension to test auto-selection of the entire math region
			extensions: [
				markdown({
					extensions: [MarkdownMathExtension],
				}),
			],
		});

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
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([
				EditorSelection.cursor(preSubListText.length + '\t* a'.length),
			]),

			extensions: [markdown()],
		});

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n * This\n * is\n\t1. a\n\t2. test\n * of list toggling'
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n * This\n * is\na\ntest\n * of list toggling'
		);

		editor.dispatch({
			selection: EditorSelection.cursor(preSubListText.length),
		});

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.selection.main.from).toBe('# List test\n'.length);
		expect(editor.state.selection.main.to).toBe(editor.state.doc.length);
		expect(editor.state.doc.toString()).toBe(
			'# List test\n - [ ] This\n - [ ] is\n - [ ] a\n - [ ] test\n - [ ] of list toggling'
		);

		editor.dispatch({
			selection: EditorSelection.cursor(editor.state.doc.length),
		});
		editor.dispatch(editor.state.replaceSelection('\n\n\n'));

		toggleList(ListType.OrderedList)(editor);
		editor.dispatch(editor.state.replaceSelection('Test.\n2. Test2\n3. Test3'));

		const expectedChecklistPart =
			'# List test\n - [ ] This\n - [ ] is\n - [ ] a\n - [ ] test\n - [ ] of list toggling';
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart
			}\n\n\n1. Test.\n2. Test2\n3. Test3`
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart
			}\n\n\n- [ ] Test.\n- [ ] Test2\n- [ ] Test3`
		);

		increaseIndent(editor);
		expect(editor.state.doc.toString()).toBe(
			`${expectedChecklistPart
			}\n\n\n\t- [ ] Test.\n\t- [ ] Test2\n\t- [ ] Test3`
		);
	});

	it('Changing list type (in block quote)', () => {
		const preSubListText = '> # List test\n> * This\n> * is\n';
		const initialDocText = `${preSubListText}> \t* a\n> \t* test\n> * of list toggling`;
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([
				EditorSelection.cursor(preSubListText.length + 3),
			]),

			extensions: [markdown()],
		});

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'> # List test\n> * This\n> * is\n> \t1. a\n> \t2. test\n> * of list toggling'
		);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
	});
});

describe('Internal text manipulation', () => {
	const initialText = `Internal text manipulation
		This is a test...
		of block and inline region toggling.`;
	const codeFenceRegex = /^```\w*\s*$/;
	const inlineCodeRegionSpec = new RegionSpec({
		templateStart: '`',
		templateStop: '`',
	});
	const codeTemplate = { start: '```', stop: '```' };

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
		expect(newState.doc.toString()).toEqual(`\`\`\`\n${initialText}\n\`\`\``);
	});
});
