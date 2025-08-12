import { EditorSelection, EditorState } from '@codemirror/state';
import { increaseIndent, toggleList } from '../editorCommands/markdownCommands';
import { ListType } from '../../types';
import createTestEditor from '../testing/createTestEditor';

describe('markdownCommands.toggleList', () => {

	jest.retryTimes(2);

	it('should remove the list only at the selected line', async () => {
		const initialDocText = '- testing\n- this is a `test`\n';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(5),
			['BulletList', 'InlineCode'],
		);

		toggleList(ListType.UnorderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'testing\n- this is a `test`\n',
		);
	});

	it('should insert a numbered list with correct numbering only at the selected line', async () => {
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

	it('should correctly replace an unordered list with a numbered list only at the selected line', async () => {
		const editor = await createTestEditor(
			unorderedListText,
			EditorSelection.cursor(unorderedListText.length),
			['BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'- 1\n- 2\n- 3\n- 4\n- 5\n- 6\n1. 7',
		);
	});

	it('should not toggle the full list when the cursor is on a blank line', async () => {
		const checklistStartText = ['- [ ] This', '- [ ] is'].join('\n');
		const checklistEndText = ['- [ ] a', '- [ ] test'].join('\n');

		const input = `${checklistStartText}\n\n${checklistEndText}`;
		const expected = `${checklistStartText}\n- [ ] \n${checklistEndText}`; // new item

		const editor = await createTestEditor(
			input,
			EditorSelection.cursor(checklistStartText.length + 1), // place cursor on the blank line
			['BulletList'],
		);
		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(expected);
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

	it('should toggle only a numbered list at selected line without changing its sublists', async () => {
		const initialDocText = '1. Foo\n2. Bar\n3. Baz\n\t- Test\n\t- of\n\t- sublists\n4. Foo';

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(0),
			['OrderedList', 'BulletList'],
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'- [ ] Foo\n2. Bar\n3. Baz\n\t- Test\n\t- of\n\t- sublists\n4. Foo',
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

	it('should toggle only list on the selected line properly within block quotes', async () => {
		const preSubListText = '> # List test\n> * This\n> * is\n';
		const initialDocText = `${preSubListText}> \t* a\n> \t* test\n> * of list toggling`;
		const editor = await createTestEditor(
			initialDocText, EditorSelection.cursor(preSubListText.length + 3),
			['BlockQuote', 'BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'> # List test\n> * This\n> * is\n> \t1. a\n> \t* test\n> * of list toggling',
		);
		expect(editor.state.selection.main.from).toBe(preSubListText.length + 7);
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

	it('should preserve blank lines when toggling a checklist with blank lines', async () => {
		const listWithGaps = [
			'- A',
			'',
			'- B',
			'',
			'- C',
		].join('\n');

		const expectedAfterToggle = [
			'- [ ] A',
			'',
			'- [ ] B',
			'',
			'- [ ] C',
		].join('\n');

		const editor = await createTestEditor(
			listWithGaps,
			EditorSelection.range(0, listWithGaps.length),
			['BulletList'],
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(expectedAfterToggle);
	});

	it('should correctly toggle sublists within block quotes', async () => {
		const listInBlockQuote = `
A block quote:
> - This *
> 	- is
>	  
> 		- a test. *
>  
>		
>
> 			- TEST
> 		- Test *
> 	- a
> - test`.trim();
		const editor = await createTestEditor(
			listInBlockQuote,
			EditorSelection.range(
				'A block quote:'.length + 1,
				listInBlockQuote.length,
			),
			['BlockQuote', 'BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(`
A block quote:
> 1. This *
> 	1. is
>	  
> 		1. a test. *
>  
>		
>
> 			1. TEST
> 		2. Test *
> 	2. a
> 2. test
		`.trim());
	});

	it('should correctly toggle sublists when there are multiple cursors', async () => {
		const testDocument = `
- This (cursor)
 	- is
 	  
 		- a test. (cursor)
   
 		
 
 			- TEST
 		- Test (cursor)
 	- a (cursor)
 - test
 		`.trim();

		const getExpectedCursorLocations = (docText: string) => {
			return [...docText.matchAll(/\(cursor\)/g)]
				.map(match => match.index + match[0].length);
		};
		const initialCursors = getExpectedCursorLocations(testDocument)
			.map(location => EditorSelection.cursor(location));

		const editor = await createTestEditor(
			testDocument,
			initialCursors,
			['BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);
		// Should renumber each line with a cursor separately
		expect(editor.state.doc.toString()).toBe(`
1. This (cursor)
 	- is
 	  
 		1. a test. (cursor)
   
 		
 
 			- TEST
 		2. Test (cursor)
 	1. a (cursor)
 - test
		`.trim());
		expect(
			editor.state.selection.ranges.map(range => range.anchor),
		).toEqual(
			getExpectedCursorLocations(editor.state.doc.toString()),
		);
	});

	it('should convert a nested bulleted list to an ordered list', async () => {
		const initialDocText = [
			'- Item 1',
			'    - Sub-item 1',
			'    - Sub-item 2',
			'- Item 2',
		].join('\n');

		const expectedDocText = [
			'1. Item 1',
			'    1. Sub-item 1',
			'    2. Sub-item 2',
			'2. Item 2',
		].join('\n');

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.range(0, initialDocText.length),
			['BulletList'],
		);

		toggleList(ListType.OrderedList)(editor);

		expect(editor.state.doc.toString()).toBe(expectedDocText);
	});

	it('should convert a mixed nested list to a bulleted list', async () => {
		const initialDocText = `1. Item 1
			1. Sub-item 1
			2. Sub-item 2
		2. Item 2`;

		const expectedDocText = `- Item 1
			- Sub-item 1
			- Sub-item 2
		- Item 2`;

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.range(0, initialDocText.length),
			['OrderedList'],
		);

		toggleList(ListType.UnorderedList)(editor);

		expect(editor.state.doc.toString()).toBe(expectedDocText);
	});

	it('should preserve non-list sub-items when changing list formatting', async () => {
		const initialDocText = `1. Item 1
			1. Sub-item 1

			   \`\`\`
			   code
			   \`\`\`
			2. Sub-item 2
			   Not part of the list
			   Also not part of the list
		2. Item 2`;

		const expectedDocText = `- Item 1
			- Sub-item 1

			   \`\`\`
			   code
			   \`\`\`
			- Sub-item 2
			   Not part of the list
			   Also not part of the list
		- Item 2`;

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.range(0, initialDocText.length),
			['OrderedList'],
		);

		toggleList(ListType.UnorderedList)(editor);

		expect(editor.state.doc.toString()).toBe(expectedDocText);
	});

	it('should remove list formatting when toggling formatting in an existing list item', async () => {
		const initialDocText = `- [ ] Item 1
			- [ ] Sub-item 1

			   \`\`\`
			   code
			   \`\`\`
			- [ ] Sub-item 2
			   Not part of the list
			   Also not part of the list
		- [ ] Item 2`;

		const expectedDocText = `Item 1
			Sub-item 1

			   \`\`\`
			   code
			   \`\`\`
			Sub-item 2
			   Not part of the list
			   Also not part of the list
		Item 2`;

		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.range(0, initialDocText.length),
			['BulletList'],
		);

		toggleList(ListType.CheckList)(editor);

		expect(editor.state.doc.toString()).toBe(expectedDocText);
	});

	it.each([
		[ListType.CheckList, '', '- [ ] '],
		[ListType.OrderedList, '', '1. '],
		[ListType.UnorderedList, '', '- '],
		[ListType.UnorderedList, '> ', '> - '],
		[ListType.UnorderedList, '# Test\n\n', '# Test\n\n- '],
	])('should add lists when activated on an empty line or empty block quote (list type: %d, initial doc: %j)', async (
		listType, originalDocument, expected,
	) => {
		const editor = await createTestEditor(
			originalDocument,
			EditorSelection.cursor(originalDocument.length),
			[],
		);

		toggleList(listType)(editor);
		expect(editor.state.doc.toString()).toBe(expected);
	});
});
