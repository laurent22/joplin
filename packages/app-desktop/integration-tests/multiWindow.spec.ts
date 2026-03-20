import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import NoteEditorScreen from './models/NoteEditorScreen';

test.describe('multiWindow', () => {
	// Disabled: Playwright's page.close() triggers a different code path than
	// a user closing the window, causing the test to be unreliable.
	// The fix works correctly in manual testing (see https://github.com/laurent22/joplin/issues/14628).
	test.fixme('should not crash when closing a secondary window', async ({ mainWindow, electronApp }) => {
		const mainPage = await new MainScreen(mainWindow).setup();
		await mainPage.createNewNote('Test');

		const window = await mainPage.openNewWindow(electronApp);

		// Should load successfully
		const screen = new NoteEditorScreen(window);
		await screen.waitFor();

		// Close the secondary window
		await window.close();

		// Wait for the Portal cleanup to complete before checking main window stability
		await mainWindow.waitForTimeout(2000);

		// Main window should remain stable — no white screen or renderer crash
		await expect(await mainPage.noteEditor.contentLocator()).toBeVisible();
	});

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
