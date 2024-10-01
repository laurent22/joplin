
import { test } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('pluginApi', () => {
	for (const richTextEditor of [false, true]) {
		test(`the editor.setText command should update the current note (use RTE: ${richTextEditor})`, async ({ startAppWithPlugins }) => {
			const { app, mainWindow } = await startAppWithPlugins(['resources/test-plugins/execCommand.js']);
			const mainScreen = new MainScreen(mainWindow);
			await mainScreen.createNewNote('First note');
			const editor = mainScreen.noteEditor;

			await editor.focusCodeMirrorEditor();
			await mainWindow.keyboard.type('This content should be overwritten.');

			if (richTextEditor) {
				await editor.toggleEditorsButton.click();
				await editor.richTextEditor.click();
			}

			await mainScreen.goToAnything.runCommand(app, 'testUpdateEditorText');
			await editor.expectToHaveText('PASS');

			// Should still have the same text after switching notes:
			await mainScreen.createNewNote('Second note');
			await editor.goBack();

			await editor.expectToHaveText('PASS');
		});
	}
});

