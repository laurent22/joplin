import { markdown } from '@codemirror/lang-markdown';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { forceParsing, indentUnit, syntaxTree } from '@codemirror/language';
import { SelectionRange, EditorSelection, EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import forceFullParse from './forceFullParse';
import loadLanguages from './loadLanguages';
import markdownMathExtension from '../extensions/markdownMathExtension';
import markdownHighlightExtension, { markdownInsertExtension } from '../extensions/markdownHighlightExtension';
import markdownFrontMatterExtension from '../extensions/markdownFrontMatterExtension';

// Creates and returns a minimal editor with markdown extensions. Waits to return the editor
// until all syntax tree tags in `expectedSyntaxTreeTags` exist.
const createTestEditor = async (
	initialText: string,
	initialSelection: SelectionRange|SelectionRange[],
	expectedSyntaxTreeTags: string[],
	extraExtensions: Extension[] = [],
	addMarkdownKeymap = true,
): Promise<EditorView> => {
	await loadLanguages();

	initialSelection = Array.isArray(initialSelection) ? initialSelection : [initialSelection];

	const editor = new EditorView({
		doc: initialText,
		selection: EditorSelection.create(initialSelection),
		extensions: [
			markdown({
				extensions: [markdownMathExtension, markdownHighlightExtension, markdownInsertExtension, markdownFrontMatterExtension, GithubFlavoredMarkdownExt],
				addKeymap: addMarkdownKeymap,
			}),
			indentUnit.of('\t'),
			EditorState.tabSize.of(4),
			EditorState.allowMultipleSelections.of(true),
			extraExtensions,
		],
	});

	let sawExpectedTagCount = 0;
	while (sawExpectedTagCount < expectedSyntaxTreeTags.length) {
		forceFullParse(editor.state);

		sawExpectedTagCount = 0;
		const seenTags = new Set<string>();

		syntaxTree(editor.state).iterate({
			from: 0,
			to: editor.state.doc.length,
			enter: (node) => {
				for (const expectedTag of expectedSyntaxTreeTags) {
					if (node.name === expectedTag) {
						seenTags.add(node.name);
						sawExpectedTagCount ++;
						break;
					}
				}
			},
		});

		if (sawExpectedTagCount < expectedSyntaxTreeTags.length) {
			// const missingTags = expectedSyntaxTreeTags.filter(tagName => {
			// 	return !seenTags.has(tagName);
			// });
			// console.warn(`Didn't find all expected tags. Missing ${missingTags}. Retrying...`);

			await new Promise(resolve => {
				setTimeout(resolve, 500);
			});
		}
	}

	// forceFullParse populates the parse cache for editor.state, but the view keeps its own
	// tree that the background parser advances lazily. Extensions that build decorations from
	// syntaxTree(view.state) (e.g. makeInlineReplaceExtension) can then run against an incomplete
	// tree and skip their decorations, so force the view's own tree to complete before returning.
	forceParsing(editor, editor.state.doc.length);

	return editor;
};

export default createTestEditor;
