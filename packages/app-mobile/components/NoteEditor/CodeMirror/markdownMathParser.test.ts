import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { blockMathTagName, inlineMathContentTagName, inlineMathTagName, MarkdownMathExtension } from './markdownMathParser';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';

const syntaxTreeCreateTimeout = 500; // ms

/** Create an EditorState with markdown extensions */
const createEditorState = (initialText: string): EditorState => {
	return EditorState.create({
		doc: initialText,
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
		],
	});
};

/**
 * Returns a list of all nodes with the given name in the given editor's syntax tree.
 * Attempts to create the syntax tree if it doesn't exist.
 */
const findNodesWithName = (editor: EditorState, nodeName: string) => {
	const result: SyntaxNode[] = [];
	ensureSyntaxTree(editor, syntaxTreeCreateTimeout)?.iterate({
		enter: (node) => {
			if (node.name === nodeName) {
				result.push(node.node);
			}
		},
	});

	return result;
};

describe('Inline parsing', () => {
	it('Document with just a math region', () => {
		const documentText = '$3 + 3$';
		const editor = createEditorState(documentText);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const inlineMathContentNodes = findNodesWithName(editor, inlineMathContentTagName);

		// There should only be one inline node
		expect(inlineMathNodes.length).toBe(1);

		expect(inlineMathNodes[0].from).toBe(0);
		expect(inlineMathNodes[0].to).toBe(documentText.length);

		// The content tag should be replaced by the internal sTeX parser
		expect(inlineMathContentNodes.length).toBe(0);
	});

	it('Inline math mixed with text', () => {
		const beforeMath = '# Testing!\n\nThis is a test of ';
		const mathRegion = '$\\TeX % TeX Comment!$';
		const afterMath = ' formatting.';
		const documentText = `${beforeMath}${mathRegion}${afterMath}`;

		const editor = createEditorState(documentText);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);
		const commentNodes = findNodesWithName(editor, 'comment');

		expect(inlineMathNodes.length).toBe(1);
		expect(blockMathNodes.length).toBe(0);
		expect(commentNodes.length).toBe(1);

		expect(inlineMathNodes[0].from).toBe(beforeMath.length);
		expect(inlineMathNodes[0].to).toBe(beforeMath.length + mathRegion.length);
	});

	it('Inline math with no ending $ in a block', () => {
		const documentText = 'This is a $test\n\nof inline math$...';
		const editor = createEditorState(documentText);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);

		// Math should end if there is no matching '$'.
		expect(inlineMathNodes.length).toBe(0);
	});

	it('Shouldn\'t start if block would have spaces just inside', () => {
		const documentText = 'This is a $ test of inline math$...\n\n$Testing... $...';
		const editor = createEditorState(documentText);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});

	it('Shouldn\'t start if $ is escaped', () => {
		const documentText = 'This is a \\$test of inline math$...';
		const editor = createEditorState(documentText);
		expect(findNodesWithName(editor, inlineMathTagName).length).toBe(0);
	});
});

describe('Block math tests', () => {
	it('Document with just block math', () => {
		const documentText = '$$\n\t\\{ 1, 1, 2, 3, 5, ... \\}\n$$';
		const editor = createEditorState(documentText);
		const inlineMathNodes = findNodesWithName(editor, inlineMathTagName);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(inlineMathNodes.length).toBe(0);
		expect(blockMathNodes.length).toBe(1);

		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});

	it('Block math with comment', () => {
		const startingText = '$$ % Testing...\n\t\\text{Test.}\n$$';
		const afterMath = '\nTest.';
		const editor = createEditorState(startingText + afterMath);
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

	it('Block math without an ending tag', () => {
		const beforeMath = '# Testing...\n\n';
		const documentText = `${beforeMath}$$\n\t\\text{Testing...}\n\n\t3 + 3 = 6`;
		const editor = createEditorState(documentText);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(beforeMath.length);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});

	it('Single-line declaration of block math', () => {
		const documentText = '$$ Test. $$';
		const editor = createEditorState(documentText);
		const blockMathNodes = findNodesWithName(editor, blockMathTagName);

		expect(blockMathNodes.length).toBe(1);
		expect(blockMathNodes[0].from).toBe(0);
		expect(blockMathNodes[0].to).toBe(documentText.length);
	});
});
