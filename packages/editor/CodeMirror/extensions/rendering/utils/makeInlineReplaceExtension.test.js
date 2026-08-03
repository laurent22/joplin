'use strict';
const __importDefault = (this && this.__importDefault) || function(mod) {
	return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
const state_1 = require('@codemirror/state');
const createTestEditor_1 = __importDefault(require('../../../testing/createTestEditor'));
const replaceBackslashEscapes_1 = __importDefault(require('../replaceBackslashEscapes'));
const replaceBulletLists_1 = __importDefault(require('../replaceBulletLists'));
const replaceFormatCharacters_1 = __importDefault(require('../replaceFormatCharacters'));
const replaceInlineHtml_1 = __importDefault(require('../replaceInlineHtml'));
const replaceLinks_1 = __importDefault(require('../replaceLinks'));
jest.retryTimes(2);
const testCases = [
	{
		label: 'bold text',
		markdown: '**bold**\n',
		renderedText: 'bold',
		selectionFrom: 2,
		selectionTo: 6,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 8,
		expectedSyntaxTreeTags: ['StrongEmphasis'],
		extensions: [replaceFormatCharacters_1.default],
	},
	{
		label: 'bold italic text',
		markdown: '***bold italic***\n',
		renderedText: 'bold italic',
		selectionFrom: 3,
		selectionTo: 14,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 17,
		expectedSyntaxTreeTags: ['Emphasis', 'StrongEmphasis'],
		extensions: [replaceFormatCharacters_1.default],
	},
	{
		label: 'heading',
		markdown: '# Heading\n',
		renderedText: 'Heading',
		selectionFrom: 2,
		selectionTo: 9,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 9,
		expectedSyntaxTreeTags: ['ATXHeading1'],
		extensions: [replaceFormatCharacters_1.default],
	},
	{
		label: 'blockquote',
		markdown: '> Blockquote\n',
		renderedText: ' Blockquote',
		selectionFrom: 2,
		selectionTo: 12,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 12,
		expectedSyntaxTreeTags: ['Blockquote'],
		extensions: [replaceFormatCharacters_1.default],
	},
	{
		label: 'link',
		markdown: '[Joplin website](https://joplinapp.org)\n',
		renderedText: 'Joplin website',
		selectionFrom: 1,
		selectionTo: 15,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 39,
		expectedSyntaxTreeTags: ['Link'],
		extensions: [replaceLinks_1.default],
	},
	{
		label: 'link with bold text',
		markdown: '[**Joplin website**](https://joplinapp.org)\n',
		renderedText: 'Joplin website',
		selectionFrom: 3,
		selectionTo: 17,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 43,
		expectedSyntaxTreeTags: ['Link', 'StrongEmphasis'],
		extensions: [replaceFormatCharacters_1.default, replaceLinks_1.default],
	},
	{
		label: 'inline HTML',
		markdown: '<span style="color: red">red text</span>\n',
		renderedText: 'red text',
		selectionFrom: 25,
		selectionTo: 33,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 40,
		expectedSyntaxTreeTags: ['HTMLTag'],
		extensions: [replaceInlineHtml_1.default],
	},
	{
		label: 'escaped asterisks',
		markdown: '\\*literal asterisk\\*\n',
		renderedText: '*literal asterisk*',
		selectionFrom: 1,
		selectionTo: 20,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 20,
		expectedSyntaxTreeTags: ['Escape'],
		extensions: [replaceBackslashEscapes_1.default],
	},
	{
		label: 'bullet list item',
		markdown: '- item\n',
		renderedText: '- item',
		selectionFrom: 2,
		selectionTo: 6,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 6,
		expectedSyntaxTreeTags: ['BulletList'],
		extensions: [replaceBulletLists_1.default],
	},
	{
		label: 'bullet list item with selected leading space',
		markdown: '- item\n',
		renderedText: '- item',
		selectionFrom: 1,
		selectionTo: 6,
		expectedSelectionFrom: 0,
		expectedSelectionTo: 6,
		expectedSyntaxTreeTags: ['BulletList'],
		extensions: [replaceBulletLists_1.default],
	},
];
const directedTestCases = testCases.flatMap(testCase => [
	{ ...testCase, direction: 'forward', selection: state_1.EditorSelection.range(testCase.selectionFrom, testCase.selectionTo), expectedSelection: {
		anchor: testCase.expectedSelectionFrom,
		head: testCase.expectedSelectionTo,
	} },
	{ ...testCase, direction: 'backward', selection: state_1.EditorSelection.range(testCase.selectionTo, testCase.selectionFrom), expectedSelection: {
		anchor: testCase.expectedSelectionTo,
		head: testCase.expectedSelectionFrom,
	} },
]);
const fullyCoveredSelectionTestCases = [
	{
		label: 'hidden Markdown',
		markdown: '**bold**\n',
		selectionFrom: 0,
		selectionTo: 2,
		expectedSyntaxTreeTags: ['StrongEmphasis'],
		extensions: [replaceFormatCharacters_1.default],
	},
	{
		label: 'widget',
		markdown: '- item\n',
		selectionFrom: 0,
		selectionTo: 1,
		expectedSyntaxTreeTags: ['BulletList'],
		extensions: [replaceBulletLists_1.default],
	},
].flatMap(testCase => [
	{ ...testCase, direction: 'forward', selection: state_1.EditorSelection.range(testCase.selectionFrom, testCase.selectionTo), expectedCursor: testCase.selectionTo },
	{ ...testCase, direction: 'backward', selection: state_1.EditorSelection.range(testCase.selectionTo, testCase.selectionFrom), expectedCursor: testCase.selectionFrom },
]);
// Temporary CI diagnostic. Intermittently, `expect(textContent).toBe('red text')` fails with
// Expected: "red text" / Received: "red text" - visually identical but unequal, so the actual
// string differs by an invisible codepoint (e.g. char code 160/8203 where the healthy value has
// a normal space, 32). This logs the char codes on mismatch to identify it. Remove once diagnosed.
const expectTextContentToBe = (actual, expected) => {
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
	it.each(directedTestCases)('should include Markdown syntax for $label in a $direction mouse selection', async ({ markdown, renderedText, selection, expectedSelection, expectedSyntaxTreeTags, extensions }) => {
		const editor = await (0, createTestEditor_1.default)(markdown, state_1.EditorSelection.cursor(markdown.length), expectedSyntaxTreeTags, extensions);
		try {
			editor.dom.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
			editor.dispatch({ selection, userEvent: 'select.pointer' });
			expect(editor.state.selection.main).toMatchObject({
				anchor: selection.anchor,
				head: selection.head,
			});
			expectTextContentToBe(editor.contentDOM.textContent, renderedText);
			editor.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
			expect(editor.state.selection.main).toMatchObject(expectedSelection);
			expectTextContentToBe(editor.contentDOM.textContent, markdown.trimEnd());
		} finally {
			editor.destroy();
		}
	});
	it.each(fullyCoveredSelectionTestCases)('should turn a $direction $label selection into a cursor', async ({ markdown, selection, expectedCursor, expectedSyntaxTreeTags, extensions }) => {
		const editor = await (0, createTestEditor_1.default)(markdown, state_1.EditorSelection.cursor(markdown.length), expectedSyntaxTreeTags, extensions);
		try {
			editor.dom.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
			editor.dispatch({ selection, userEvent: 'select.pointer' });
			editor.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
			expect(editor.state.selection.main).toMatchObject({
				anchor: expectedCursor,
				head: expectedCursor,
			});
		} finally {
			editor.destroy();
		}
	});
});
// # sourceMappingURL=makeInlineReplaceExtension.test.js.map
