import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import NoteEditorScreen from './models/NoteEditorScreen';

test.describe('multiWindow', () => {
	test('should not crash when closing a secondary window', async ({ mainWindow, electronApp }) => {
		const mainPage = await new MainScreen(mainWindow).setup();
		await mainPage.createNewNote('Test');

		const window = await mainPage.openNewWindow(electronApp);

		// Should load successfully
		const screen = new NoteEditorScreen(window);
		await screen.waitFor();

		// Close the secondary window
		await window.close();

		// Main window should remain stable — no white screen or renderer crash
		await expect(await mainPage.noteEditor.contentLocator()).toBeVisible();
	});

	test('should support quickly creating, then closing secondary windows', async ({ mainWindow, electronApp }) => {
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

