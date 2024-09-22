import { markdown } from '@codemirror/lang-markdown';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { indentUnit, syntaxTree } from '@codemirror/language';
import { SelectionRange, EditorSelection, EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownMathExtension } from '../markdown/markdownMathParser';
import forceFullParse from './forceFullParse';
import loadLanguages from './loadLanguages';

// Creates and returns a minimal editor with markdown extensions. Waits to return the editor
// until all syntax tree tags in `expectedSyntaxTreeTags` exist.
const createTestEditor = async (
	initialText: string,
	initialSelection: SelectionRange,
	expectedSyntaxTreeTags: string[],
	extraExtensions: Extension[] = [],
): Promise<EditorView> => {
	await loadLanguages();

	const editor = new EditorView({
		doc: initialText,
		selection: EditorSelection.create([initialSelection]),
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
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

	return editor;
};

export default createTestEditor;
