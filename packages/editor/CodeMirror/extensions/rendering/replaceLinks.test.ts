import createTestEditor from '../../testing/createTestEditor';
import { EditorSelection } from '@codemirror/state';
import replaceLinks from './replaceLinks';

describe('replaceLinks', () => {
	it.each([
		{
			label: 'should not hide link Markdown when the label is empty',
			markup: 'test: [](https://example.com)',
			expectedText: 'test: [](https://example.com)',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should not hide whitespace-only links',
			markup: 'test: [ ](https://example.com)',
			expectedText: 'test: [ ](https://example.com)',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should hide link Markdown when a title is present',
			markup: 'test: [test](https://example.com)',
			expectedText: 'test: test',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should not hide URLs with no label section',
			markup: 'test: https://example.com',
			expectedText: 'test: https://example.com',

			expectedSyntaxTags: ['URL'],
		},
	])('$label', async ({ markup, expectedText, expectedSyntaxTags }) => {
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), expectedSyntaxTags, [replaceLinks]);
		expect(editor.contentDOM.textContent).toBe(expectedText);
	});
});
