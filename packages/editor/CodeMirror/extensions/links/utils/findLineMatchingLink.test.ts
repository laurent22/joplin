import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../../testing/createTestEditor';
import findLineMatchingLink from './findLineMatchingLink';

describe('findLineMatchingLink', () => {
	test.each([
		// Should match headings
		['# Heading\n', '#heading', 1],
		['# Heading', '#heading', 1],
		['## Heading', '#heading', 1],
		['### Heading', '#heading', 1],
		// Should match headings not on the first line
		['\n### Heading', '#heading', 2],
		['# Test\n\n### Heading', '#heading', 3],
		['# Test\n\n### Heading\n\ntest', '#heading', 3],
		// Should return null when there are no matches
		['# Heading', '#missing-heading', null],

		// Should match footnotes
		['[^1]: Footnote!\n', '[^1]', 1],
		['[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', 1],
		['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', 2],
		['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^not a footnote]', null],

		// Should not process http:// links
		['# Test', 'http://example.com', null],

	])('should correctly find lines matching the given link (doc: %j, link: %j) (case %#)', async (
		doc, link, expectedMatchingLine,
	) => {
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), []);
		expect(
			findLineMatchingLink(link, editor.state)?.number ?? null,
		).toBe(expectedMatchingLine);
	});
});
