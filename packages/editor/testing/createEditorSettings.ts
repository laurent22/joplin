import { themeStyle } from '@joplin/lib/theme';
import { EditorKeymap, EditorLanguageType, EditorSettings } from '../types';

const createEditorSettings = (themeId: number) => {
	const themeData = { themeId, ...themeStyle(themeId) };
	const editorSettings: EditorSettings = {
		markdownMarkEnabled: true,
		katexEnabled: true,
		spellcheckEnabled: true,
		useExternalSearch: true,
		readOnly: false,
		automatchBraces: false,
		ignoreModifiers: false,
		autocompleteMarkup: true,
		tabMovesFocus: false,
		inlineRenderingEnabled: true,
		highlightActiveLine: false,

		keymap: EditorKeymap.Default,
		preferMacShortcuts: false,
		language: EditorLanguageType.Markdown,
		themeData,

		indentWithTabs: true,
		editorLabel: 'Markdown editor',
		imageRenderingEnabled: false,
	};

	return editorSettings;
};

export default createEditorSettings;
