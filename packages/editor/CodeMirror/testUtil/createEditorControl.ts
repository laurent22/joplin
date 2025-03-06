import Setting from '@joplin/lib/models/Setting';
import createEditor from '../createEditor';
import createEditorSettings from './createEditorSettings';

const createEditorControl = (initialText: string) => {
	const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

	return createEditor(document.body, {
		initialText,
		initialNoteId: '',
		settings: editorSettings,
		onEvent: _event => {},
		onLogMessage: _message => {},
		onPasteFile: null,
	});
};

export default createEditorControl;
