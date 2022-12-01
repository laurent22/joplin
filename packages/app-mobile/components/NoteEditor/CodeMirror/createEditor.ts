import { markdown } from '@codemirror/lang-markdown';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { forceParsing, indentUnit } from '@codemirror/language';
import { SelectionRange, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownMathExtension } from './markdownMathParser';

// Creates and returns a minimal editor with markdown math and GFM extensions
const createEditor = (initialText: string, initialSelection?: SelectionRange): EditorView => {
	const selection = initialSelection ? EditorSelection.create([initialSelection]) : undefined;
	const editor = new EditorView({
		doc: initialText,
		selection,
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
			indentUnit.of('\t'),
			EditorState.tabSize.of(4),
		],
	});

	forceParsing(editor);
	return editor;
};

export default createEditor;
