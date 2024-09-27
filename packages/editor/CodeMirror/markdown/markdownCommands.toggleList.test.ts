import { EditorSelection, EditorState } from '@codemirror/state';
import {
	increaseIndent, toggleList,
} from './markdownCommands';
import { ListType } from '../../types';
import createTestEditor from '../testUtil/createTestEditor';

describe('markdownCommands.toggleList', () => {

	jest.retryTimes(2);

	it('should remove the same type of list', async () => {
		const initialDocText = '- testing\n- this is a `test`\n';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(5),
			['BulletList', 'InlineCode'],
		);

		toggleList(ListType.UnorderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'testing\nthis is a `test`\n',
		);
	});

	it('should insert a numbered list with correct numbering', async () => {
		const initialDocText = 'Testing...\nThis is a test\nof list toggling...';
		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor('Testing...\nThis is a'.length),
			[],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'Testing...\n1. This is a test\nof list toggling...',
		);

		editor.setState(EditorState.create({
			doc: initialDocText,
			selection: EditorSelection.range(4, initialDocText.length),
		}));

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'1. Testing...\n2. This is a test\n3. of list toggling...',
		);
	});

	const unorderedListText = '- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n- 7';

	it('should correctly replace an unordered list with a numbered list', async () => {
		const editor = await createTestEditor(
			unorderedListText,
			EditorSelection.cursor(unorderedListText.length),
			['BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'1. 1\n2. 2\n3. 3\n4. 4\n5. 5\n6. 6\n7. 7',
		);
	});

	it('should not toggle a the full list when the cursor is on a blank line', async () => {
		const checklistStartText = [
			'# Test',
			'',
			'- [ ] This',
			'- [ ] is',
			'',
		].join('\n');

		const checklistEndText = [
			'- [ ] a',
			'- [ ] test',
		].join('\n');

		const editor = await createTestEditor(
			`${checklistStartText}\n${checklistEndText}`,

			// Place the cursor on the blank line between the checklist
			// regions
			EditorSelection.cursor(unorderedListText.length + 1),
			['BulletList', 'ATXHeading1'],
		);

		// Should create a checkbox on the blank line
		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			`${checklistStartText}- [ ] \n${checklistEndText}`,
		);
	});

	// it('should correctly replace an unordered list with a checklist', async () => {
	// 	const editor = await createEditor(
	// 		unorderedListText,
	// 		EditorSelection.cursor(unorderedListText.length),
	// 		['BulletList']
	// 	);

	// 	toggleList(ListType.CheckList)(editor);
	// 	expect(editor.state.doc.toString()).toBe(
	// 		'- [ ] 1\n- [ ] 2\n- [ ] 3\n- [ ] 4\n- [ ] 5\n- [ ] 6\n- [ ] 7'
	// 	);
	// });

	// it('should properly toggle a sublist of a bulleted list', async () => {
	// 	const preSubListText = '# List test\n * This\n * is\n';
	// 	const initialDocText = `${preSubListText}\t* a\n\t* test\n * of list toggling`;

	// 	const editor = await createEditor(
	// 		initialDocText,
	// 		EditorSelection.cursor(preSubListText.length + '\t* a'.length),
	// 		['BulletList', 'ATXHeading1']
	// 	);

	// 	// Indentation should be preserved when changing list types
	// 	toggleList(ListType.OrderedList)(editor);
	// 	expect(editor.state.doc.toString()).toBe(
	// 		'# List test\n * This\n * is\n\t1. a\n\t2. test\n * of list toggling'
	// 	);

	// 	// The changed region should be selected
	// 	expect(editor.state.selection.main.from).toBe(preSubListText.length);
	// 	expect(editor.state.selection.main.to).toBe(
	// 		`${preSubListText}\t1. a\n\t2. test`.length
	// 	);
	// });

	// it('should not preserve indentation when removing sublists', async () => {
	// 	const preSubListText = '# List test\n * This\n * is\n';
	// 	const initialDocText = `${preSubListText}\t1. a\n\t2. test\n * of list toggling`;

	// 	const editor = await createEditor(
	// 		initialDocText,
	// 		EditorSelection.range(preSubListText.length, `${preSubListText}\t1. a\n\t2. test`.length),
	// 		['ATXHeading1', 'BulletList', 'OrderedList']
	// 	);

	// 	// Indentation should not be preserved when removing lists
	// 	toggleList(ListType.OrderedList)(editor);
	// 	expect(editor.state.selection.main.from).toBe(preSubListText.length);
	// 	expect(editor.state.doc.toString()).toBe(
	// 		'# List test\n * This\n * is\na\ntest\n * of list toggling'
	// 	);

	// 	// Put the cursor in the middle of the list
	// 	editor.dispatch({ selection: EditorSelection.cursor(preSubListText.length) });

	// 	// Sublists should be changed
	// 	toggleList(ListType.CheckList)(editor);
	// 	const expectedChecklistPart =
	// 		'# List test\n - [ ] This\n - [ ] is\n - [ ] a\n - [ ] test\n - [ ] of list toggling';
	// 	expect(editor.state.doc.toString()).toBe(
	// 		expectedChecklistPart
	// 	);

	// 	editor.dispatch({ selection: EditorSelection.cursor(editor.state.doc.length) });
	// 	editor.dispatch(editor.state.replaceSelection('\n\n\n'));

	// 	// toggleList should also create a new list if the cursor is on an empty line.
	// 	toggleList(ListType.OrderedList)(editor);
	// 	editor.dispatch(editor.state.replaceSelection('Test.\n2. Test2\n3. Test3'));

	// 	expect(editor.state.doc.toString()).toBe(
	// 		`${expectedChecklistPart}\n\n\n1. Test.\n2. Test2\n3. Test3`
	// 	);

	// 	toggleList(ListType.CheckList)(editor);
	// 	expect(editor.state.doc.toString()).toBe(
	// 		`${expectedChecklistPart}\n\n\n- [ ] Test.\n- [ ] Test2\n- [ ] Test3`
	// 	);

	// 	// The entire checklist should have been selected (and thus will now be indented)
	// 	increaseIndent(editor);
	// 	expect(editor.state.doc.toString()).toBe(
	// 		`${expectedChecklistPart}\n\n\n\t- [ ] Test.\n\t- [ ] Test2\n\t- [ ] Test3`
	// 	);
	// });

	it('should toggle a numbered list without changing its sublists', async () => {
		const initialDocText = '1. Foo\n2. Bar\n3. Baz\n\t- Test\n\t- of\n\t- sublists\n4. Foo';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(0),
			['OrderedList', 'BulletList'],
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'- [ ] Foo\n- [ ] Bar\n- [ ] Baz\n\t- Test\n\t- of\n\t- sublists\n- [ ] Foo',
		);
	});

	it('should toggle a sublist without changing the parent list', async () => {
		const initialDocText = '1. This\n2. is\n3. ';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(initialDocText.length),
			['OrderedList'],
		);

		increaseIndent(editor);
		expect(editor.state.selection.main.empty).toBe(true);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'1. This\n2. is\n\t- [ ] ',
		);

		editor.dispatch(editor.state.replaceSelection('a test.'));
		expect(editor.state.doc.toString()).toBe(
			'1. This\n2. is\n\t- [ ] a test.',
		);
	});

	it('should toggle lists properly within block quotes', async () => {
		const preSubListText = '> # List test\n> * This\n> * is\n';
		const initialDocText = `${preSubListText}> \t* a\n> \t* test\n> * of list toggling`;
		const editor = await createTestEditor(
			initialDocText, EditorSelection.cursor(preSubListText.length + 3),
			['BlockQuote', 'BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'> # List test\n> * This\n> * is\n> \t1. a\n> \t2. test\n> * of list toggling',
		);
		expect(editor.state.selection.main.from).toBe(preSubListText.length);
	});

	it('should not treat a list of IP addresses as a numbered list', async () => {
		const initialDocText = '192.168.1.1. This\n127.0.0.1. is\n0.0.0.0. a list';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.range(0, initialDocText.length),
			[],
		);

		toggleList(ListType.UnorderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'- 192.168.1.1. This\n- 127.0.0.1. is\n- 0.0.0.0. a list',
		);
	});
});
