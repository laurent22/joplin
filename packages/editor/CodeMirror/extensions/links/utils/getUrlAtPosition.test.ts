import { syntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../../testing/createTestEditor';
import forceFullParse from '../../../testing/forceFullParse';
import getUrlAtPosition from './getUrlAtPosition';
import referenceLinkStateField from '../referenceLinksStateField';

describe('getUrlAtPosition', () => {
	test.each([
		['inside [x] marker text', (doc: string) => doc.indexOf('[x]') + 1],
		['inside surrounding link label text', (doc: string) => doc.indexOf('note') + 1],
		['at the label closing bracket', (doc: string) => doc.lastIndexOf('](')],
	])('should extract URL for link labels with task markers (%s)', async (_label, getPosition) => {
		const doc = '[My note#[x] title](:/abc123#x-title)';
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), [], [referenceLinkStateField]);
		forceFullParse(editor.state);

		const position = getPosition(doc);
		const match = getUrlAtPosition(position, syntaxTree(editor.state), editor.state);
		expect(match?.url).toBe(':/abc123#x-title');
	});
});
