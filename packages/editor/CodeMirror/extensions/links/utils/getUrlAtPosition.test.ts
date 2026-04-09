import { syntaxTree } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../../testing/createTestEditor';
import getUrlAtPosition from './getUrlAtPosition';

describe('getUrlAtPosition', () => {
	test.each([
		['on [x] within the link label', (doc: string) => doc.indexOf('[x]') + 1],
		['on surrounding label text', (doc: string) => doc.indexOf('note') + 1],
		['at the closing label bracket', (doc: string) => doc.indexOf('](')],
	])('should extract the URL when cursor is %s', async (_label, getPos) => {
		const link = ':/131d7ddac2e94ec7a86e90631f47fbae#x-title';
		const doc = `[My note#[x] title](${link})`;
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), ['Link']);

		const url = getUrlAtPosition(getPos(doc), syntaxTree(editor.state), editor.state);

		expect(url?.url).toBe(link);
	});
});
