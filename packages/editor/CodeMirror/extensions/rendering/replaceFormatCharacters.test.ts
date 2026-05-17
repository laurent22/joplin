import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import replaceFormatCharacters from './replaceFormatCharacters';
import waitFor from '@joplin/lib/testing/waitFor';

describe('replaceFormatCharacters', () => {
	jest.retryTimes(2);

	test('should hide link syntax for links with title', async () => {
		const markdown = '\n\n[title](https://example.com)\n\n';
		const editor = await createTestEditor(
			markdown,
			EditorSelection.cursor(0),
			['Link', 'URL'],
			[replaceFormatCharacters],
		);

		await waitFor(() => {
			// Brackets, parens, and the URL should be hidden — only the title remains visible.
			expect(editor.contentDOM.textContent).not.toContain('https://example.com');
			expect(editor.contentDOM.textContent).toContain('title');
		});
	});

	test.each([
		'[](https://example.com)',
		'[ ](https://example.com)',
		'[   ](https://example.com)',
	])('should show only the URL when title is empty or whitespace-only and cursor is elsewhere (%s)', async (link) => {
		// Regression test for https://github.com/laurent22/joplin/issues/15425
		const markdown = `\n\n${link}\n\n`;
		const editor = await createTestEditor(
			markdown,
			EditorSelection.cursor(0),
			['Link', 'URL'],
			[replaceFormatCharacters],
		);

		await waitFor(() => {
			// Only the URL is visible on the link's line — no brackets, no
			// parens, no leading whitespace from the empty title.
			const linkLine = editor.contentDOM.textContent.split('\n').find(line => line.includes('example.com'));
			expect(linkLine).toBe('https://example.com');
		});
	});

	test('should reveal full link syntax for links with empty title when cursor is on the link', async () => {
		const markdown = '[](https://example.com)';
		const editor = await createTestEditor(
			markdown,
			EditorSelection.cursor(markdown.indexOf('(') + 1),
			['Link', 'URL'],
			[replaceFormatCharacters],
		);

		await waitFor(() => {
			expect(editor.contentDOM.textContent).toContain('[](https://example.com)');
		});
	});
});
