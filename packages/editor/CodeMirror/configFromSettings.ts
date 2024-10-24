import { EditorView, keymap } from '@codemirror/view';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { EditorKeymap, EditorLanguageType, EditorSettings } from '../types';
import createTheme from './theme';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { GFM as GitHubFlavoredMarkdownExtension } from '@lezer/markdown';
import { MarkdownMathExtension } from './markdown/markdownMathParser';
import lookUpLanguage from './markdown/codeBlockLanguages/lookUpLanguage';
import { html } from '@codemirror/lang-html';
import { defaultKeymap, emacsStyleKeymap } from '@codemirror/commands';
import { vim } from '@replit/codemirror-vim';
import { indentUnit } from '@codemirror/language';
import { Prec } from '@codemirror/state';

const configFromSettings = (settings: EditorSettings) => {
	const languageExtension = (() => {
		const openingBrackets = '`([{\'"‘“（《「『【〔〖〘〚'.split('');

		const language = settings.language;
		if (language === EditorLanguageType.Markdown) {
			return [
				markdown({
					extensions: [
						GitHubFlavoredMarkdownExtension,

						// Don't highlight KaTeX if the user disabled it
						settings.katexEnabled ? MarkdownMathExtension : [],
					],
					codeLanguages: lookUpLanguage,
				}),
				markdownLanguage.data.of({ closeBrackets: openingBrackets }),
			];
		} else if (language === EditorLanguageType.Html) {
			return html();
		} else {
			const exhaustivenessCheck: never = language;
			return exhaustivenessCheck;
		}
	})();

	const extensions = [
		languageExtension,
		createTheme(settings.themeData),
		EditorView.contentAttributes.of({
			autocapitalize: 'sentence',
			autocorrect: settings.spellcheckEnabled ? 'true' : 'false',
			spellcheck: settings.spellcheckEnabled ? 'true' : 'false',
			'aria-label': settings.editorLabel,
		}),
		EditorState.readOnly.of(settings.readOnly),
		indentUnit.of(settings.indentWithTabs ? '\t' : '    '),
	];

	if (settings.automatchBraces) {
		extensions.push(closeBrackets());
		extensions.push(keymap.of(closeBracketsKeymap));
	}

	if (settings.keymap === EditorKeymap.Vim) {
		extensions.push(Prec.high(vim()));
	} else if (settings.keymap === EditorKeymap.Emacs) {
		extensions.push(keymap.of(emacsStyleKeymap));
	}

	if (!settings.ignoreModifiers) {
		extensions.push(Prec.low(keymap.of(defaultKeymap)));
	}

	return extensions;
};

export default configFromSettings;
