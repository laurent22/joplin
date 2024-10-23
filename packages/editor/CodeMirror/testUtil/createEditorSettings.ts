import { themeStyle } from '@joplin/lib/theme';
import { EditorKeymap, EditorLanguageType, EditorSettings } from '../../types';

const createEditorSettings = (themeId: number) => {
	const themeData = themeStyle(themeId);
	const editorSettings: EditorSettings = {
		katexEnabled: true,
		spellcheckEnabled: true,
		useExternalSearch: true,
		readOnly: false,
		automatchBraces: false,
		ignoreModifiers: false,
		autocompleteMarkup: true,

		keymap: EditorKeymap.Default,
		language: EditorLanguageType.Markdown,
		themeData,

		indentWithTabs: true,
	};

	return editorSettings;
};

export default createEditorSettings;
