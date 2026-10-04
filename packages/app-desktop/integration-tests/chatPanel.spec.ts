import { test } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('chatPanel', () => {
	test('should not clear undo history when opening/closing the chat panel', async ({ mainWindow, electronApp }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('test');

		const noteEditor = mainScreen.noteEditor;
		const markdownEditor = await noteEditor.showMarkdownEditor();
		await markdownEditor.typeText('Testing');
		await noteEditor.expectToHaveText('Testing');

		await mainScreen.chatPanel.configure(electronApp);
		await mainScreen.chatPanel.open(electronApp);
		await mainScreen.chatPanel.close(electronApp);

		// Should still have the correct content
		await noteEditor.expectToHaveText('Testing');

		// Should be possible to undo everything
		for (let i = 0; i < 'Testing'.length; i++) {
			await noteEditor.undo(electronApp);
		}
		await noteEditor.expectToHaveText(/^[\n]?$/);
	});
});

