import { EditorView } from '@codemirror/view';
import { EditorLanguageType, EditorSettings } from '../types';
import createTheme from './theme';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM as GitHubFlavoredMarkdownExtension } from '@lezer/markdown';
import { MarkdownMathExtension } from './markdownMathParser';
import syntaxHighlightingLanguages from './syntaxHighlightingLanguages';
import { html } from '@codemirror/lang-html';

const configFromSettings = (settings: EditorSettings) => {
	const languageExtension = (() => {
		const language = settings.language;
		if (language === EditorLanguageType.Markdown) {
			return markdown({
				extensions: [
					GitHubFlavoredMarkdownExtension,

					// Don't highlight KaTeX if the user disabled it
					settings.katexEnabled ? MarkdownMathExtension : [],
				],
				codeLanguages: syntaxHighlightingLanguages,
			});
		} else if (language === EditorLanguageType.Html) {
			return html();
		} else {
			const exhaustivenessCheck: never = language;
			return exhaustivenessCheck;
		}
	})();

	return [
		languageExtension,
		createTheme(settings.themeData),
		EditorView.contentAttributes.of({
			autocapitalize: 'sentence',
			autocorrect: settings.spellcheckEnabled ? 'true' : 'false',
			spellcheck: settings.spellcheckEnabled ? 'true' : 'false',
		}),
		EditorState.readOnly.of(settings.readOnly),
	];
};

export default configFromSettings;
