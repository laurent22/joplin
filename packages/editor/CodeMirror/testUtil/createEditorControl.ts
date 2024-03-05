import Setting from '@joplin/lib/models/Setting';
import createEditor from '../createEditor';
import createEditorSettings from './createEditorSettings';

const createEditorControl = (initialText: string) => {
	const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

	return createEditor(document.body, {
		initialText,
		settings: editorSettings,
		onEvent: _event => {},
		onLogMessage: _message => {},
	});
};

export default createEditorControl;
