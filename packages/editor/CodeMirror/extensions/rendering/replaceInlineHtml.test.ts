import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import replaceInlineHtml from './replaceInlineHtml';

const createEditor = async (initialMarkdown: string, expectedTags: string[] = ['HTMLTag']) => {
	const editor = await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		expectedTags,
		[replaceInlineHtml],
	);
	return editor;
};

describe('replaceInlineHtml', () => {
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

		expect(editor.contentDOM.querySelector(expectedTagsQuery)).toBeTruthy();
	});
});
