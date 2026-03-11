import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import NoteEditorScreen from './models/NoteEditorScreen';

test.describe('multiWindow', () => {
	// Disabled: This test often hangs when closing secondary windows (see https://github.com/laurent22/joplin/issues/14628):
	test.fixme('should support quickly creating, then closing secondary windows', async ({ mainWindow, electronApp }) => {
		const mainPage = await new MainScreen(mainWindow).setup();
		await mainPage.createNewNote('Test');

		const windows = [];
		for (let i = 0; i < 4; i++) {
			const window = await mainPage.openNewWindow(electronApp);

			// Should load successfully
			const screen = new NoteEditorScreen(window);
			await screen.waitFor();

			windows.push(window);
		}

		// Close them all, very quickly.
		for (const window of windows) {
			await window.close();
		}

		// Should not have crashed
		await expect(await mainPage.noteEditor.contentLocator()).toBeVisible();
	});
});

