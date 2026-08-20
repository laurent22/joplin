import { EditorSelection, Extension } from '@codemirror/state';
import createTestEditor from '../../../testing/createTestEditor';
import replaceBackslashEscapes from '../replaceBackslashEscapes';
import replaceBulletLists from '../replaceBulletLists';
import replaceFormatCharacters from '../replaceFormatCharacters';
import replaceInlineHtml from '../replaceInlineHtml';
import replaceLinks from '../replaceLinks';
import visibleEditorText from '../../../testing/visibleEditorText';

jest.retryTimes(2);

interface TestCase {
	label: string;
	markdown: string;
	renderedText: string;
	selectionFrom: number;
	selectionTo: number;
	expectedSyntaxTreeTags: string[];
	extensions: Extension[];
}

const testCases: TestCase[] = [
	{
		label: 'bold text',
		markdown: '**bold**\n',
		renderedText: 'bold',
		selectionFrom: 2,
		selectionTo: 6,
		expectedSyntaxTreeTags: ['StrongEmphasis'],
		extensions: [replaceFormatCharacters],
	},
	{
		label: 'bold italic text',
		markdown: '***bold italic***\n',
		renderedText: 'bold italic',
		selectionFrom: 3,
		selectionTo: 14,
		expectedSyntaxTreeTags: ['Emphasis', 'StrongEmphasis'],
		extensions: [replaceFormatCharacters],
	},
	{
		label: 'heading',
		markdown: '# Heading\n',
		renderedText: 'Heading',
		selectionFrom: 2,
		selectionTo: 9,
		expectedSyntaxTreeTags: ['ATXHeading1'],
		extensions: [replaceFormatCharacters],
	},
	{
		label: 'blockquote',
		markdown: '> Blockquote\n',
		renderedText: ' Blockquote',
		selectionFrom: 2,
		selectionTo: 12,
		expectedSyntaxTreeTags: ['Blockquote'],
		extensions: [replaceFormatCharacters],
	},
	{
		label: 'link',
		markdown: '[Joplin website](https://joplinapp.org)\n',
		renderedText: 'Joplin website',
		selectionFrom: 1,
		selectionTo: 15,
		expectedSyntaxTreeTags: ['Link'],
		extensions: [replaceLinks],
	},
	{
		label: 'link with bold text',
		markdown: '[**Joplin website**](https://joplinapp.org)\n',
		renderedText: 'Joplin website',
		selectionFrom: 3,
		selectionTo: 17,
		expectedSyntaxTreeTags: ['Link', 'StrongEmphasis'],
		extensions: [replaceFormatCharacters, replaceLinks],
	},
	{
		label: 'inline HTML',
		markdown: '<span style="color: red">red text</span>\n',
		renderedText: 'red text',
		selectionFrom: 25,
		selectionTo: 33,
		expectedSyntaxTreeTags: ['HTMLTag'],
		extensions: [replaceInlineHtml],
	},
	{
		label: 'escaped asterisks',
		markdown: '\\*literal asterisk\\*\n',
		renderedText: '*literal asterisk*',
		selectionFrom: 1,
		selectionTo: 20,
		expectedSyntaxTreeTags: ['Escape'],
		extensions: [replaceBackslashEscapes],
	},
	{
		label: 'bullet list item',
		markdown: '- item\n',
		renderedText: '- item',
		selectionFrom: 2,
		selectionTo: 6,
		expectedSyntaxTreeTags: ['BulletList'],
		extensions: [replaceBulletLists],
	},
	{
		label: 'bullet list item with selected leading space',
		markdown: '- item\n',
		renderedText: '- item',
		selectionFrom: 1,
		selectionTo: 6,
		expectedSyntaxTreeTags: ['BulletList'],
		extensions: [replaceBulletLists],
	},
];

const directedTestCases = testCases.flatMap(testCase => [
	{
		...testCase,
		direction: 'forward',
		selection: EditorSelection.range(testCase.selectionFrom, testCase.selectionTo),
	},
	{
		...testCase,
		direction: 'backward',
		selection: EditorSelection.range(testCase.selectionTo, testCase.selectionFrom),
	},
]);

// Temporary CI diagnostic. Intermittently, `expect(textContent).toBe('red text')` fails with
// Expected: "red text" / Received: "red text" - visually identical but unequal, so the actual
// string differs by an invisible codepoint (e.g. char code 160/8203 where the healthy value has
// a normal space, 32). This logs the char codes on mismatch to identify it. Remove once diagnosed.
const expectTextContentToBe = (actual: string, expected: string) => {
	if (actual !== expected) {
		// eslint-disable-next-line no-console
		console.error('FLAKE_DIAGNOSTIC', JSON.stringify({
			expectedCodes: [...expected].map(character => character.charCodeAt(0)),
			actualCodes: [...actual].map(character => character.charCodeAt(0)),
		}));
	}
	expect(actual).toBe(expected);
};

describe('makeInlineReplaceExtension', () => {
	beforeAll(() => {
		jest.useFakeTimers({ advanceTimers: true });
	});

	it.each(directedTestCases)('should include Markdown syntax for $label in a $direction mouse selection', async ({
		markdown, renderedText, selection, expectedSyntaxTreeTags, extensions,
	}) => {
		const editor = await createTestEditor(
			markdown,
			EditorSelection.cursor(markdown.length),
			expectedSyntaxTreeTags,
			extensions,
		);

		try {
			editor.dom.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
			editor.dispatch({ selection, userEvent: 'select.pointer' });
			jest.runAllTimers();

			const expectedSelection = {
				anchor: selection.anchor,
				head: selection.head,
			};
			expect(editor.state.selection.main).toMatchObject(expectedSelection);
			expectTextContentToBe(visibleEditorText(editor), renderedText);

			editor.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
			await jest.runAllTimersAsync();

			expect(editor.state.selection.main).toMatchObject(expectedSelection);
			expectTextContentToBe(visibleEditorText(editor), markdown.trimEnd());
		} finally {
			editor.destroy();
		}
	});
});
