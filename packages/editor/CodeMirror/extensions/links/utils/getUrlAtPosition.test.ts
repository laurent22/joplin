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

	test.each([
		['inline code', 'Before `[x](https://example.com)` after', ['InlineCode']],
		['fenced code', '```\n[x](https://example.com)\n```', ['FencedCode']],
	])('should not extract a fallback URL from %s', async (_label, doc, expectedTags) => {
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), expectedTags);
		const pos = doc.indexOf('[x]') + 1;

		const url = getUrlAtPosition(pos, syntaxTree(editor.state), editor.state);

		expect(url).toBeNull();
	});
});
