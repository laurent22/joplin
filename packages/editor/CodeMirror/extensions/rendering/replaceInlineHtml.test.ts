import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import replaceInlineHtml from './replaceInlineHtml';
import waitFor from '@joplin/lib/testing/waitFor';

const createEditorWithCursor = async (initialMarkdown: string, cursorIndex: number, expectedTags: string[] = ['HTMLTag']) => {
	const editor = await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(cursorIndex),
		expectedTags,
		[replaceInlineHtml],
	);
	return editor;
};

const createEditor = async (initialMarkdown: string, expectedTags: string[] = ['HTMLTag']) => {
	return createEditorWithCursor(initialMarkdown, 0, expectedTags);
};

describe('replaceInlineHtml', () => {
	jest.retryTimes(2);

	test.each([
		{ markdown: '<sup>Test</sup>', expectedDomTags: 'sup' },
		{ markdown: '<strike>Test</strike>', expectedDomTags: 'strike' },
		{ markdown: 'Test: <span style="color: red;">Test</span>', expectedDomTags: 'span[style]' },
		{ markdown: 'Test: <span style="color: rgb(123, 0, 0);">Test</span>', expectedDomTags: 'span[style]' },
		{
			markdown: '<sup>Test *test*...</sup>',
			expectedDomTags: 'sup',
			initialSyntaxTags: ['HTMLTag', 'Emphasis'],
		},
	])('should render inline HTML (case %#)', async ({ markdown, expectedDomTags: expectedTagsQuery, initialSyntaxTags }) => {
		// Add additional newlines: Ensure that the cursor isn't initially on the same line as the content to be rendered:
		const editor = await createEditor(`\n\n${markdown}\n\n`, initialSyntaxTags);

		// Retry on failure to handle the case where the syntax tree is slow:
		await waitFor(() => {
			expect(editor.contentDOM.querySelector(expectedTagsQuery)).toBeTruthy();
		});
	});

	test('should keep other inline HTML rendered when cursor is on same line, but not touching tags', async () => {
		const markdown = 'A <sub>one</sub> B <sub>two</sub>';
		const editor = await createEditorWithCursor(markdown, markdown.indexOf('A'));

		await waitFor(() => {
			expect(editor.contentDOM.querySelectorAll('sub')).toHaveLength(2);
		});
	});

	test('should reveal only the inline HTML touched by the cursor', async () => {
		const markdown = 'A <sub>one</sub> B <sub>two</sub>';
		const cursorAtFirstSubContent = markdown.indexOf('one') + 1;
		const editor = await createEditorWithCursor(markdown, cursorAtFirstSubContent);

		await waitFor(() => {
			expect(editor.contentDOM.querySelectorAll('sub')).toHaveLength(1);
		});
	});

	test('should not hide incomplete inline HTML tags', async () => {
		const markdown = '<sup>x';
		const editor = await createEditorWithCursor(markdown, markdown.length);

		await waitFor(() => {
			expect(editor.contentDOM.textContent).toContain('<sup>x');
		});
	});

	test('should not style incomplete inline HTML tags', async () => {
		const markdown = '<strike>';
		const editor = await createEditorWithCursor(markdown, markdown.length, []);

		await waitFor(() => {
			expect(editor.contentDOM.querySelector('strike')).toBeFalsy();
			expect(editor.contentDOM.textContent).toContain('<strike>');
		});
	});
});
