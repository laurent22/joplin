import { markdown } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { blockMathTagName, inlineMathContentTagName, inlineMathTagName, MarkdownMathExtension } from './markdownMathParser';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import forceFullParse from './testUtil/forceFullParse';
import loadLangauges from './testUtil/loadLanguages';

// Creates an EditorState with math and markdown extensions
const createEditorState = async (initialText: string): Promise<EditorState> => {
	await loadLangauges();

	const editorState = EditorState.create({
		doc: initialText,
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
		],
	});
	forceFullParse(editorState);

	return editorState;
};

// Returns a list of all nodes with the given name in the given editor's syntax tree.
// Attempts to create the syntax tree if it doesn't exist.
const findNodesWithName = (editor: EditorState, nodeName: string) => {
	const result: SyntaxNode[] = [];
	syntaxTree(editor).iterate({
		enter: (node) => {
			if (node.name === nodeName) {
				result.push(node.node);
			}
		},
	});

	return result;
};

describe('markdownMathParser', () => {

	it('should parse inline math that contains space characters, numbers, and symbols', async () => {
		const documentText = '$3 + 3$';
		const editor = await createEditorState(documentText);
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

		const editor = await createEditorState(documentText);
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
		const documentText = 'This is a $test\n\nof inline math$...';
		const editor = await createEditorState(documentText);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);

		// Math should end if there is no matching '$'.
		expect(inlineMathNodes.length).toBe(0);
	});

	it('shouldn\'t start if math would have a space just after the $', async () => {
		const documentText = 'This is a $ test of inline math$...\n\n$Testing... $...';
		const editor = await createEditorState(documentText);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});

	it('shouldn\'t start inline math if $ is escaped', async () => {
		const documentText = 'This is a \\$test of inline math$...';
		const editor = await createEditorState(documentText);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});

	it('should correctly parse document containing just block math', async () => {
		const documentText = '$$\n\t\\{ 1, 1, 2, 3, 5, ... \\}\n$$';
		const editor = await createEditorState(documentText);
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
		const editor = await createEditorState(startingText + afterMath);
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
		const documentText = `${beforeMath}$$\n\t\\text{Testing...}\n\n\t3 + 3 = 6`;
		const editor = await createEditorState(documentText);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(beforeMath.length);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});

	it('should parse block math declared on a single line', async () => {
		const documentText = '$$ Test. $$';
		const editor = await createEditorState(documentText);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});
});
