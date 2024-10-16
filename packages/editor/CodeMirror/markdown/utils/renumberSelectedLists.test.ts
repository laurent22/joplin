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
});
