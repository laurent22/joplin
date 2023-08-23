import { EditorSelection } from '@codemirror/state';
import {
	toggleBolded, toggleCode, toggleHeaderLevel, toggleItalicized, toggleMath, updateLink,
} from './markdownCommands';
import createEditor from './testUtil/createEditor';
import { blockMathTagName } from './markdownMathParser';

describe('markdownCommands', () => {
	it('should bold/italicize everything selected', async () => {
		const initialDocText = 'Testing...';
		const editor = await createEditor(
			initialDocText, EditorSelection.range(0, initialDocText.length), [],
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

	it('for a cursor, bolding, then italicizing, should produce a bold-italic region', async () => {
		const initialDocText = '';
		const editor = await createEditor(
			initialDocText, EditorSelection.cursor(0), [],
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

	it('toggling math should both create and navigate out of math regions', async () => {
		const initialDocText = 'Testing... ';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), []);

		toggleMath(editor);
		expect(editor.state.doc.toString()).toBe('Testing... $$');
		expect(editor.state.selection.main.empty).toBe(true);

		editor.dispatch(editor.state.replaceSelection('3 + 3 \\neq 5'));
		expect(editor.state.doc.toString()).toBe('Testing... $3 + 3 \\neq 5$');

		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('...'));
		expect(editor.state.doc.toString()).toBe('Testing... $3 + 3 \\neq 5$...');
	});

	it('toggling inline code should both create and navigate out of an inline code region', async () => {
		const initialDocText = 'Testing...\n\n';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), []);

		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		toggleCode(editor);

		editor.dispatch(editor.state.replaceSelection(' is a function.'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n`f(x) = ...` is a function.');
	});

	it('should set headers to the proper levels (when toggling)', async () => {
		const initialDocText = 'Testing...\nThis is a test.';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(3), []);

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

	it('headers should toggle properly within block quotes', async () => {
		const initialDocText = 'Testing...\n\n> This is a test.\n> ...a test';
		const editor = await createEditor(
			initialDocText,
			EditorSelection.cursor('Testing...\n\n> This'.length),
			['Blockquote'],
		);

		toggleHeaderLevel(1)(editor);

		const mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toBe(
			'Testing...\n\n> # This is a test.\n> ...a test',
		);
		expect(mainSel.empty).toBe(true);
		expect(mainSel.from).toBe('Testing...\n\n> # This is a test.'.length);

		toggleHeaderLevel(3)(editor);

		expect(editor.state.doc.toString()).toBe(
			'Testing...\n\n> ### This is a test.\n> ...a test',
		);
	});

	it('block math should be created correctly within block quotes', async () => {
		const initialDocText = 'Testing...\n\n> This is a test.\n> y = mx + b\n> ...a test';
		const editor = await createEditor(
			initialDocText,
			EditorSelection.range(
				'Testing...\n\n> This'.length,
				'Testing...\n\n> This is a test.\n> y = mx + b'.length,
			),
			['Blockquote'],
		);

		toggleMath(editor);

		// Toggling math should surround the content in '$$'s
		const mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual(
			'Testing...\n\n> $$\n> This is a test.\n> y = mx + b\n> $$\n> ...a test',
		);
		expect(mainSel.from).toBe('Testing...\n\n'.length);
		expect(mainSel.to).toBe('Testing...\n\n> $$\n> This is a test.\n> y = mx + b\n> $$'.length);
	});

	it('block math should be correctly removed within block quotes', async () => {
		const initialDocText = 'Testing...\n\n> $$\n> This is a test.\n> y = mx + b\n> $$\n> ...a test';

		const editor = await createEditor(
			initialDocText,
			EditorSelection.cursor('Testing...\n\n> $$\n> This is'.length),
			['Blockquote', blockMathTagName],
		);

		// Toggling math should remove the '$$'s
		toggleMath(editor);
		const mainSel = editor.state.selection.main;
		expect(editor.state.doc.toString()).toEqual('Testing...\n\n> This is a test.\n> y = mx + b\n> ...a test');
		expect(mainSel.from).toBe('Testing...\n\n'.length);
		expect(mainSel.to).toBe('Testing...\n\n> This is a test.\n> y = mx + b'.length);
	});

	it('updateLink should replace link titles and isolate URLs if no title is given', async () => {
		const initialDocText = '[foo](http://example.com/)';
		const editor = await createEditor(initialDocText, EditorSelection.cursor('[f'.length), ['Link']);

		updateLink('bar', 'https://example.com/')(editor);
		expect(editor.state.doc.toString()).toBe(
			'[bar](https://example.com/)',
		);

		updateLink('', 'https://example.com/')(editor);
		expect(editor.state.doc.toString()).toBe(
			'https://example.com/',
		);
	});

	it('toggling math twice, starting on a line with content, should a math block', async () => {
		const initialDocText = 'Testing... ';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), []);

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing... \n$$\nf(x) = ...\n$$');
	});

	it('toggling math twice on an empty line should create an empty math block', async () => {
		const initialDocText = 'Testing...\n\n';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), []);

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n$$\nf(x) = ...\n$$');
	});

	it('toggling code twice on an empty line should create an empty code block', async () => {
		const initialDocText = 'Testing...\n\n';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), []);

		// Toggling code twice should create a block code region
		toggleCode(editor);
		toggleCode(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe('Testing...\n\n```\nf(x) = ...\n```');

		toggleCode(editor);
		expect(editor.state.doc.toString()).toBe('Testing...\n\nf(x) = ...\n');
	});

	it('toggling math twice inside a block quote should produce an empty math block', async () => {
		const initialDocText = '> Testing...> \n> ';
		const editor = await createEditor(initialDocText, EditorSelection.cursor(initialDocText.length), ['Blockquote']);

		toggleMath(editor);
		toggleMath(editor);
		editor.dispatch(editor.state.replaceSelection('f(x) = ...'));
		expect(editor.state.doc.toString()).toBe(
			'> Testing...> \n> \n> $$\n> f(x) = ...\n> $$',
		);

		// If we toggle math again, everything from the start of the line with the first
		// $$ to the end of the document should be selected.
		toggleMath(editor);
		const sel = editor.state.selection.main;
		expect(sel.from).toBe('> Testing...> \n> \n'.length);
		expect(sel.to).toBe(editor.state.doc.length);
	});
});

