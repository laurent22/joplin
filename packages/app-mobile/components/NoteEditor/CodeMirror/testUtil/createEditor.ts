import { markdown } from '@codemirror/lang-markdown';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { indentUnit } from '@codemirror/language';
import { SelectionRange, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownMathExtension } from '../markdownMathParser';
import forceFullParse from './forceFullParse';
import loadLangauges from './loadLanguages';

// Creates and returns a minimal editor with markdown extensions
const createEditor = async (initialText: string, initialSelection: SelectionRange): Promise<EditorView> => {
	await loadLangauges();

	const editor = new EditorView({
		doc: initialText,
		selection: EditorSelection.create([initialSelection]),
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
			indentUnit.of('\t'),
			EditorState.tabSize.of(4),
		],
	});

	forceFullParse(editor.state);
	return editor;
};

export default createEditor;
