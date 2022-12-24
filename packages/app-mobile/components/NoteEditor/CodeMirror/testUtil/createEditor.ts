import { markdown } from '@codemirror/lang-markdown';
import { GFM as GithubFlavoredMarkdownExt } from '@lezer/markdown';
import { indentUnit, syntaxTree } from '@codemirror/language';
import { SelectionRange, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownMathExtension } from '../markdownMathParser';
import forceFullParse from './forceFullParse';
import loadLangauges from './loadLanguages';

// Creates and returns a minimal editor with markdown extensions
const createEditor = async (initialText: string, initialSelection: SelectionRange): Promise<EditorView> => {
	await loadLangauges();

	const trailingText = '\n\nAdditional text that we know will be parsed: $3+\\text{3}$';

	const editor = new EditorView({
		doc: initialText + trailingText,
		selection: EditorSelection.create([initialSelection]),
		extensions: [
			markdown({
				extensions: [MarkdownMathExtension, GithubFlavoredMarkdownExt],
			}),
			indentUnit.of('\t'),
			EditorState.tabSize.of(4),
		],
	});

	// HACK: Try to determine whether we've successfully finished parsing.
	// This is imperfect as we ultimately remove the content we add, forcing at least a
	// partial re-parse.
	const addedTextFrom = initialText.length;
	const addedTextTo = initialText.length + trailingText.length;

	let sawExpectedText = false;

	while (!sawExpectedText) {
		forceFullParse(editor.state);
		syntaxTree(editor.state).iterate({
			from: addedTextFrom,
			to: addedTextTo,
			enter: (node) => {
				// Search for the TeX tag name (the \\text).
				if (node.name === 'tagName') {
					sawExpectedText = true;
				}
			},
		});

		if (!sawExpectedText) {
			console.log('Extra tag not parsed. Retrying...');

			await new Promise(resolve => {
				setTimeout(resolve, 500);
			});
		}
	}

	// Remove the additional text we added
	editor.dispatch(editor.state.update({
		changes: {
			from: addedTextFrom,
			to: addedTextTo,
		},
	}));

	forceFullParse(editor.state);

	return editor;
};

export default createEditor;
