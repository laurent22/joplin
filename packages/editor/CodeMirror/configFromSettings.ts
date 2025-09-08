import { EditorView, keymap } from '@codemirror/view';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { EditorKeymap, EditorLanguageType, EditorSettings } from '../types';
import createTheme from './theme';
import { EditorState } from '@codemirror/state';
import { deleteMarkupBackward, markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { GFM as GitHubFlavoredMarkdownExtension } from '@lezer/markdown';
import markdownMathExtension from './extensions/markdownMathExtension';
import markdownHighlightExtension from './extensions/markdownHighlightExtension';
import lookUpLanguage from './utils/markdown/codeBlockLanguages/lookUpLanguage';
import { html } from '@codemirror/lang-html';
import { defaultKeymap, emacsStyleKeymap } from '@codemirror/commands';
import { vim } from '@replit/codemirror-vim';
import { indentUnit } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import insertNewlineContinueMarkup from './editorCommands/insertNewlineContinueMarkup';
import renderingExtension from './extensions/rendering/renderingExtension';
import { RenderedContentContext } from './extensions/rendering/types';
import highlightActiveLineExtension from './extensions/highlightActiveLineExtension';
import renderBlockImages from './extensions/rendering/renderBlockImages';

const configFromSettings = (settings: EditorSettings, context: RenderedContentContext) => {
	const languageExtension = (() => {
		const openingBrackets = '`([{\'"‘“（《「『【〔〖〘〚'.split('');

		const language = settings.language;
		if (language === EditorLanguageType.Markdown) {
			return [
				markdown({
					extensions: [
						GitHubFlavoredMarkdownExtension,

						settings.markdownMarkEnabled ? markdownHighlightExtension : [],

						// Don't highlight KaTeX if the user disabled it
						settings.katexEnabled ? markdownMathExtension : [],
					],
					codeLanguages: lookUpLanguage,

					...(settings.autocompleteMarkup ? {
						// Most Markup completion is enabled by default
						addKeymap: false, // However, we have our own keymap
					} : {
						addKeymap: false,
						completeHTMLTags: false,
						htmlTagLanguage: html({ matchClosingTags: false, autoCloseTags: false }),
					}),
				}),
				markdownLanguage.data.of({ closeBrackets: { brackets: openingBrackets } }),
				keymap.of(settings.autocompleteMarkup ? [
					{ key: 'Enter', run: insertNewlineContinueMarkup },
					{ key: 'Backspace', run: deleteMarkupBackward },
				] : []),
			];
		} else if (language === EditorLanguageType.Html) {
			return html({ autoCloseTags: settings.autocompleteMarkup });
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

	if (settings.inlineRenderingEnabled) {
		extensions.push(renderingExtension());
	}

	if (settings.imageRenderingEnabled) {
		extensions.push(renderBlockImages(context));
	}

	if (settings.highlightActiveLine) {
		extensions.push(highlightActiveLineExtension());
	}

	return extensions;
};

export default configFromSettings;
