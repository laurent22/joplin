import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testUtil/createTestEditor';
import renumberSelectedLists from './renumberSelectedLists';

describe('renumberSelectedLists', () => {
	it('should correctly renumber a list with multiple selections in that list', async () => {
		const listText = [
			'1. This',
			'\t2. is',
			'\t3. a',
			'4. test',
		].join('\n');

		const editor = await createTestEditor(
			`${listText}\n\n# End`,
			EditorSelection.cursor(listText.length),
			['OrderedList', 'ATXHeading1', 'ATXHeading2'],
		);

		// Include a selection twice in the same list
		const initialSelection = EditorSelection.create([
			EditorSelection.cursor('1. This\n2.'.length), // Middle of second line
			EditorSelection.cursor('1. This\n2. is\n3'.length), // Beginning of third line
		]);

		editor.dispatch({
			selection: initialSelection,
		});

		editor.dispatch(renumberSelectedLists(editor.state));

		expect(editor.state.doc.toString()).toBe([
			'1. This',
			'\t1. is',
			'\t2. a',
			'2. test',
			'',
			'# End',
		].join('\n'));
	});

	it('should preserve the first list number if not 1', async () => {
		const listText = [
			'2. This',
			'4. is',
			'5. a',
			'6. test',
		].join('\n');

		const editor = await createTestEditor(
			`${listText}\n\n# End`,
			EditorSelection.range(0, listText.length),
			['OrderedList', 'ATXHeading1'],
		);

		editor.dispatch(renumberSelectedLists(editor.state));

		expect(editor.state.doc.toString()).toBe([
			'2. This',
			'3. is',
			'4. a',
			'5. test',
			'',
			'# End',
		].join('\n'));
	});

	it.each([
		{
			// Should handle the case where a single item is over-indented
			before: [
				'- This',
				'- is',
				'\t1. a',
				'\t\t2. test',
				'\t3. of',
				'\t4. lists',
			].join('\n'),
			after: [
				'- This',
				'- is',
				'\t1. a',
				'\t\t1. test',
				'\t2. of',
				'\t3. lists',
			].join('\n'),
		},
		{
			// Should handle the case where multiple sublists need to be renumbered
			before: [
				'- This',
				'- is',
				'\t1. a',
				'\t\t2. test',
				'\t3. of',
				'\t\t4. lists',
				'\t\t5. lists',
				'\t\t6. lists',
				'\t7. lists',
				'',
				'',
				'1. New list',
				'\t3. Item',
			].join('\n'),
			after: [
				'- This',
				'- is',
				'\t1. a',
				'\t\t1. test',
				'\t2. of',
				'\t\t1. lists',
				'\t\t2. lists',
				'\t\t3. lists',
				'\t3. lists',
				'',
				'',
				'1. New list',
				'\t1. Item',
			].join('\n'),
		},
		{
			before: [
				'2. This',
				'\t1. is',
				'\t2. a',
				'\t\t3. test',
				'\t4. test',
				'\t5. test',
				'\t6. test',
			].join('\n'),
			after: [
				'2. This',
				'\t1. is',
				'\t2. a',
				'\t\t1. test',
				'\t3. test',
				'\t4. test',
				'\t5. test',
			].join('\n'),
		},
	])('should handle nested lists (case %#)', async ({ before, after }) => {
		const suffix = '\n\n# End';
		before += suffix;
		after += suffix;
		const editor = await createTestEditor(
			before,
			EditorSelection.range(0, before.length - suffix.length),
			['OrderedList', 'ATXHeading1'],
		);

		editor.dispatch(renumberSelectedLists(editor.state));

		expect(editor.state.doc.toString()).toBe(after);
	});
});
