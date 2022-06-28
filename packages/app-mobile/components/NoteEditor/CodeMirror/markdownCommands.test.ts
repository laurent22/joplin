/**
 * @jest-environment jsdom
 */

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { toggleBolded, toggleHeaderLevel, toggleRegionFormat } from './markdownCommands';
import RegionSpec from './RegionSpec';

describe('Formatting commands', () => {
	it('Bolding (everything selected)', () => {
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
	});

	it('Toggling header', () => {
		const initialDocText = 'Testing...\nThis is a test.';
		const editor = new EditorView({
			doc: initialDocText,
			selection: EditorSelection.create([EditorSelection.cursor(3, 3)]),
		});

		toggleHeaderLevel(1)(editor);

		let mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual('# Testing...\nThis is a test.');
		expect(mainSel.empty).toBeTruthy();
		expect(mainSel.from).toBe('# Testing...'.length);

		toggleHeaderLevel(2)(editor);

		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual('## Testing...\nThis is a test.');
		expect(mainSel.empty).toBeTruthy();
		expect(mainSel.from).toBe('## Testing...'.length);

		toggleHeaderLevel(2)(editor);

		mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(initialDocText);
		expect(mainSel.empty).toBeTruthy();
		expect(mainSel.from).toBe('Testing...'.length);
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
