import { syntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import forceFullParse from '../../testing/forceFullParse';
import getCheckboxAtPosition from './getCheckboxAtPosition';

describe('getCheckboxAtPosition', () => {
	test('should detect checkboxes in task list items', async () => {
		const doc = '- [x] Test item';
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), []);
		forceFullParse(editor.state);

		const checkboxPos = doc.indexOf('[x]') + 1;
		expect(getCheckboxAtPosition(checkboxPos, syntaxTree(editor.state))).toBeTruthy();
	});

	test('should ignore task markers inside link labels', async () => {
		const doc = '[My note#[x] title](:/abc123#x-title)';
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), []);
		forceFullParse(editor.state);

		const taskMarkerPos = doc.indexOf('[x]') + 1;
		expect(getCheckboxAtPosition(taskMarkerPos, syntaxTree(editor.state))).toBeNull();
	});
});
