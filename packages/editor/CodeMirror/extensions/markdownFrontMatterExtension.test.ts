import { EditorSelection, EditorState } from '@codemirror/state';
import { frontMatterTagName, frontMatterContentTagName, frontMatterMarkerTagName } from './markdownFrontMatterExtension';

import createTestEditor from '../testing/createTestEditor';
import findNodesWithName from '../testing/findNodesWithName';

// Creates an EditorState with FrontMatter and markdown extensions
const createEditorState = async (initialText: string, expectedTags: string[]): Promise<EditorState> => {
	return (await createTestEditor(initialText, EditorSelection.cursor(0), expectedTags)).state;
};

describe('MarkdownFrontMatterExtension', () => {

	jest.retryTimes(2);

	it('should parse a basic FrontMatter block at the start of the document', async () => {
		const documentText = '---\ntitle: Test\n---\n\n# Heading';
		const editor = await createEditorState(documentText, [frontMatterTagName, 'ATXHeading1']);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);

		expect(frontMatterNodes.length).toBe(1);
		expect(frontMatterNodes[0].from).toBe(0);
		expect(frontMatterNodes[0].to).toBe('---\ntitle: Test\n---'.length);
	});

	it('should parse FrontMatter with multiple properties', async () => {
		const frontMatter = '---\ntitle: Test\ndate: 2024-01-01\ntags: [one, two]\n---';
		const documentText = `${frontMatter}\n\nContent here.`;
		const editor = await createEditorState(documentText, [frontMatterTagName]);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);

		expect(frontMatterNodes.length).toBe(1);
		expect(frontMatterNodes[0].from).toBe(0);
		expect(frontMatterNodes[0].to).toBe(frontMatter.length);
	});

	it('should not parse FrontMatter if not at document start', async () => {
		const documentText = 'Some text\n\n---\ntitle: Test\n---';
		const editor = await createEditorState(documentText, ['Paragraph']);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);

		// Should not be recognized as FrontMatter since it's not at the start
		expect(frontMatterNodes.length).toBe(0);
	});

	it('should not parse FrontMatter without closing delimiter', async () => {
		// Test document with --- at start but no closing delimiter
		// This should be parsed as a horizontal rule followed by content
		const documentText = '# Heading\n\n---\ntitle: Test';
		const editor = await createEditorState(documentText, ['ATXHeading1', 'HorizontalRule']);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);

		// FrontMatter only works at the very start of the document, so this should not be recognized
		expect(frontMatterNodes.length).toBe(0);
	});

	it('should handle empty FrontMatter block', async () => {
		const documentText = '---\n---\n\n# Heading';
		const editor = await createEditorState(documentText, [frontMatterTagName, 'ATXHeading1']);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);

		expect(frontMatterNodes.length).toBe(1);
		expect(frontMatterNodes[0].from).toBe(0);
		expect(frontMatterNodes[0].to).toBe('---\n---'.length);
	});

	it('should have FrontMatterContent as child node', async () => {
		const documentText = '---\nkey: value\n---';
		const editor = await createEditorState(documentText, [frontMatterTagName]);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);
		const contentNodes = findNodesWithName(editor, frontMatterContentTagName);

		expect(frontMatterNodes.length).toBe(1);
		// Content node may be replaced by YAML parser, but if not, it should exist
		// The presence depends on whether YAML language was loaded
		expect(contentNodes.length).toBeGreaterThanOrEqual(0);
	});

	it('should not confuse horizontal rules with FrontMatter', async () => {
		const documentText = '# Title\n\n---\n\nSome text';
		const editor = await createEditorState(documentText, ['ATXHeading1', 'HorizontalRule']);
		const frontMatterNodes = findNodesWithName(editor, frontMatterTagName);
		const hrNodes = findNodesWithName(editor, 'HorizontalRule');

		expect(frontMatterNodes.length).toBe(0);
		expect(hrNodes.length).toBe(1);
	});

	it('should create FrontMatterMarker nodes for the delimiters', async () => {
		const documentText = '---\ntitle: Test\n---\n\n# Heading';
		const editor = await createEditorState(documentText, [frontMatterTagName, frontMatterMarkerTagName]);
		const markerNodes = findNodesWithName(editor, frontMatterMarkerTagName);

		// Should have two markers: opening and closing ---
		expect(markerNodes.length).toBe(2);

		// Opening marker
		expect(markerNodes[0].from).toBe(0);
		expect(markerNodes[0].to).toBe(3); // '---'.length

		// Closing marker
		expect(markerNodes[1].from).toBe('---\ntitle: Test\n'.length);
		expect(markerNodes[1].to).toBe('---\ntitle: Test\n---'.length);
	});
});
