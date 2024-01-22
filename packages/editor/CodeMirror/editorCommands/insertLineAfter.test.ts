import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import insertLineAfter from './insertLineAfter';

describe('insertLineAfter', () => {
	test('should continue lists', async () => {
		const editor = await createTestEditor(
			'- This\n- is\n- a test',
			EditorSelection.cursor(1),
			['BulletList'],
		);
		insertLineAfter(editor);
		expect(editor.state.doc.toString()).toBe([
			'- This',
			'- ',
			'- is',
			'- a test',
		].join('\n'));
	});
});
