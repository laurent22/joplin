import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testing/createTestEditor';
import findPositionMatchingLink from './findPositionMatchingLink';

describe('findPositionMatchingLink', () => {
	test.each([
		// Should match headings
		['# Heading\n', '#heading', '# Heading'.length],
		['# Heading', '#heading', '# Heading'.length],
		['## Heading', '#heading', '## Heading'.length],
		['### Heading', '#heading', '### Heading'.length],
		// Should match headings not on the first line
		['\n### Heading', '#heading', '\n### Heading'.length],
		['# Test\n\n### Heading', '#heading', '# Test\n\n### Heading'.length],
		['# Test\n\n### Heading\n\ntest', '#heading', '# Test\n\n### Heading'.length],
		// Should return null when there are no matches
		['# Heading', '#missing-heading', null],

		// Should match footnotes
		['[^1]: Footnote!\n', '[^1]', '[^1]: Footnote!'.length],
		['[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', '[^1]: Footnote!'.length],
		['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^1]', '# ^1\n[^1]: Footnote!'.length],
		['# ^1\n[^1]: Footnote!\n[^2]: Other footnote.', '[^not a footnote]', null],

		// Should not process http:// links
		['# Test', 'http://example.com', null],

	])('should correctly find lines matching the given link (doc: %j, link: %j) (case %#)', async (
		doc, link, expectedMatchingLine,
	) => {
		const editor = await createTestEditor(doc, EditorSelection.cursor(0), []);
		expect(
			findPositionMatchingLink(link, editor.state) ?? null,
		).toBe(expectedMatchingLine);
	});
});
