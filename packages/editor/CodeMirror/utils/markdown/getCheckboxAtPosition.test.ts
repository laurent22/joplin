import { syntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import getCheckboxAtPosition from './getCheckboxAtPosition';

describe('getCheckboxAtPosition', () => {
	it('should ignore [x] in inline markdown link labels', async () => {
		const doc = '[My note#[x] title](:/131d7ddac2e94ec7a86e90631f47fbae#x-title)';
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), ['Link']);

		const markerPos = doc.indexOf('[x]') + 1;
		const taskMarker = getCheckboxAtPosition(markerPos, syntaxTree(editor.state));

		expect(taskMarker).toBeNull();
	});

	it('should still detect real task-list checkboxes', async () => {
		const doc = '- [x] Finished task';
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), ['TaskMarker']);

		const markerPos = doc.indexOf('[x]') + 1;
		const taskMarker = getCheckboxAtPosition(markerPos, syntaxTree(editor.state));

		expect(taskMarker?.name).toBe('TaskMarker');
	});
});
