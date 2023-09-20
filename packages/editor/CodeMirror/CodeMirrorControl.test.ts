import createEditor from './createEditor';
import createEditorSettings from './testUtil/createEditorSettings';
import Setting from '@joplin/lib/models/Setting';

const createEditorControls = (initialText: string) => {
	const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

	return createEditor(document.body, {
		initialText,
		settings: editorSettings,
		onEvent: _event => {},
		onLogMessage: _message => {},
	});
};

describe('CodeMirrorControl', () => {
	it('clearHistory should clear the undo/redo history', () => {
		const controls = createEditorControls('');

		const insertedText = 'Testing... This is a test...';
		controls.insertText(insertedText);

		const fullInsertedText = insertedText;
		expect(controls.getValue()).toBe(fullInsertedText);

		// Undo should work before clearing history
		controls.undo();
		expect(controls.getValue()).toBe('');

		controls.redo();
		controls.clearHistory();

		expect(controls.getValue()).toBe(fullInsertedText);

		// Should not be able to undo cleared changes
		controls.undo();
		expect(controls.getValue()).toBe(fullInsertedText);

		// Should be able to undo new changes
		controls.insertText('!!!');
		expect(controls.getValue()).toBe(`${fullInsertedText}!!!`);

		controls.undo();
		expect(controls.getValue()).toBe(fullInsertedText);
	});
});
