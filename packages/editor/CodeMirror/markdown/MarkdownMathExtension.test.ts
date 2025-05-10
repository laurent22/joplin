import { EditorSelection, EditorState } from '@codemirror/state';
import { blockMathTagName, inlineMathContentTagName, inlineMathTagName } from './MarkdownMathExtension';

import createTestEditor from '../testUtil/createTestEditor';
import findNodesWithName from '../testUtil/findNodesWithName';

// Creates an EditorState with math and markdown extensions
const createEditorState = async (initialText: string, expectedTags: string[]): Promise<EditorState> => {
	return (await createTestEditor(initialText, EditorSelection.cursor(0), expectedTags)).state;
};

describe('MarkdownMathExtension', () => {

	jest.retryTimes(2);

	it('should parse inline math that contains space characters, numbers, and symbols', async () => {
		const documentText = '$3 + 3$';
		const editor = await createEditorState(documentText, [inlineMathTagName, 'number']);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const inlineMathContentNodes = findNodesWithName(editor, inlineMathContentTagName);

		// There should only be one inline node
		expect(inlineMathNodes.length).toBe(1);

		expect(inlineMathNodes[0].from).toBe(0);
		expect(inlineMathNodes[0].to).toBe(documentText.length);

		// The content tag should be replaced by the internal sTeX parser
		expect(inlineMathContentNodes.length).toBe(0);
	});

	it('should parse comment within multi-word inline math', async () => {
		const beforeMath = '# Testing!\n\nThis is a test of ';
		const mathRegion = '$\\TeX % TeX Comment!$';
		const afterMath = ' formatting.';
		const documentText = `${beforeMath}${mathRegion}${afterMath}`;

		const editor = await createEditorState(documentText, [inlineMathTagName, 'comment']);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);
		const commentNodes = findNodesWithName(editor, 'comment');

		expect(inlineMathNodes.length).toBe(1);
		expect(blockMathNodes.length).toBe(0);
		expect(commentNodes.length).toBe(1);

		expect(inlineMathNodes[0].from).toBe(beforeMath.length);
		expect(inlineMathNodes[0].to).toBe(beforeMath.length + mathRegion.length);
	});

	it('shouldn\'t start inline math if there is no ending $', async () => {
		const documentText = '*This* is a $test\n\nof inline math$...';
		const editor = await createEditorState(documentText, ['Emphasis']);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);

		// Math should end if there is no matching '$'.
		expect(inlineMathNodes.length).toBe(0);
	});

	it('shouldn\'t start if math would have a space just after the $', async () => {
		const documentText = 'This *is* a $ test of inline math$...\n\n$Testing... $...';
		const editor = await createEditorState(documentText, ['Emphasis']);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});

	it('shouldn\'t start inline math if $ is escaped', async () => {
		const documentText = 'This is a \\$test of inline math$... **Testing...**';
		const editor = await createEditorState(documentText, ['StrongEmphasis']);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});

	it('should correctly parse document containing just block math', async () => {
		const documentText = '$$\n\t\\{ 1, 1, 2, 3, 5, ... \\} % Comment\n$$';
		const editor = await createEditorState(documentText, [blockMathTagName, 'comment']);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(inlineMathNodes.length).toBe(0);
		expect(blockMathNodes.length).toBe(1);

		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});

	it('should correctly parse comment in block math', async () => {
		const startingText = '$$ % Testing...\n\t\\text{Test.}\n$$';
		const afterMath = '\nTest.';
		const editor = await createEditorState(startingText + afterMath, ['comment', blockMathTagName]);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);
		const texParserComments = findNodesWithName(editor, 'comment');

		expect(inlineMathNodes.length).toBe(0);
		expect(blockMathNodes.length).toBe(1);
		expect(texParserComments.length).toBe(1);

		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(startingText.length);

		expect(texParserComments[0]).toMatchObject({
			from: '$$ '.length,
			to: '$$ % Testing...'.length,
		});
	});

	it('should extend block math without ending tag to end of document', async () => {
		const beforeMath = '# Testing...\n\n';
		const documentText = `${beforeMath}$$\n\t\\text{Testing...}\n\n\t3 + 3 = 6 % Comment`;
		const editor = await createEditorState(documentText, ['ATXHeading1', blockMathTagName, 'comment']);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(beforeMath.length);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});

	it('should parse block math declared on a single line', async () => {
		const documentText = '$$ Test. $$';
		const editor = await createEditorState(documentText, [blockMathTagName]);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});
});
