import { EditorKeymap, EditorLanguageType, EditorSettings, EditorTheme } from '@joplin/editor/types';
import shim from '@joplin/lib/shim';
import { MarkupLanguage, MarkupToHtml } from '@joplin/renderer';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../../../../../app.reducer';
import { _ } from '@joplin/lib/locale';
import { isDeepStrictEqual } from 'node:util';

interface EditorSettingsProps {
	contentMarkupLanguage: MarkupLanguage;
	keyboardMode: string;
	disabled: boolean;
	tabMovesFocus: boolean;
	baseTheme: EditorTheme;
}

const useEditorSettings = (props: EditorSettingsProps) => {
	const stateToSettings = (state: AppState) => ({
		markdownMark: state.settings['markdown.plugin.mark'],
		markdownInsert: state.settings['markdown.plugin.insert'],
		katex: state.settings['markdown.plugin.katex'],
		inlineRendering: state.settings['editor.inlineRendering'],
		imageRendering: state.settings['editor.imageRendering'],
		highlightActiveLine: state.settings['editor.highlightActiveLine'],
		monospaceFont: state.settings['style.editor.monospaceFontFamily'],
		automatchBraces: state.settings['editor.autoMatchingBraces'],
		autocompleteMarkup: state.settings['editor.autocompleteMarkup'],
		spellcheckEnabled: state.settings['editor.spellcheckBeta'],
	});
	type SelectedSettings = ReturnType<typeof stateToSettings>;
	const settings = useSelector<AppState, SelectedSettings>(stateToSettings, isDeepStrictEqual);

	return useMemo((): EditorSettings => {
		const isHTMLNote = props.contentMarkupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML;

		let keyboardMode = EditorKeymap.Default;
		if (props.keyboardMode === 'vim') {
			keyboardMode = EditorKeymap.Vim;
		} else if (props.keyboardMode === 'emacs') {
			keyboardMode = EditorKeymap.Emacs;
		}

		return {
			language: isHTMLNote ? EditorLanguageType.Html : EditorLanguageType.Markdown,
			readOnly: props.disabled,
			markdownMarkEnabled: settings.markdownMark,
			markdownInsertEnabled: settings.markdownInsert,
			katexEnabled: settings.katex,
			inlineRenderingEnabled: settings.inlineRendering,
			imageRenderingEnabled: settings.imageRendering,
			highlightActiveLine: settings.highlightActiveLine,
			themeData: {
				...props.baseTheme,
				marginLeft: 0,
				marginRight: 0,
				monospaceFont: settings.monospaceFont,
			},
			automatchBraces: settings.automatchBraces,
			autocompleteMarkup: settings.autocompleteMarkup,
			useExternalSearch: false,
			ignoreModifiers: true,
			spellcheckEnabled: settings.spellcheckEnabled,
			keymap: keyboardMode,
			preferMacShortcuts: shim.isMac(),
			indentWithTabs: true,
			tabMovesFocus: props.tabMovesFocus,
			editorLabel: _('Markdown editor'),
		};
	}, [
		props.contentMarkupLanguage, props.disabled, props.keyboardMode, props.baseTheme,
		props.tabMovesFocus, settings,
	]);
};

export default useEditorSettings;
