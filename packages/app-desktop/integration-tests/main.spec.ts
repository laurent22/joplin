import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import activateMainMenuItem from './util/activateMainMenuItem';
import SettingsScreen from './models/SettingsScreen';


test.describe('main', () => {
	test('app should launch', async ({ mainWindow }) => {
		// A window should open with the correct title
		expect(await mainWindow.title()).toMatch(/^Joplin/);

		const mainPage = new MainScreen(mainWindow);
		await mainPage.waitFor();
	});

	test('should be able to create and edit a new note', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.newNoteButton.click();

		const editor = mainScreen.noteEditor;
		await editor.waitFor();

		// Wait for the title input to have the correct placeholder
		await mainWindow.locator('input[placeholder^="Creating new note"]').waitFor();

		// Fill the title
		await editor.noteTitleInput.click();
		await editor.noteTitleInput.fill('Test note');

		// Note list should contain the new note
		await expect(mainScreen.noteListContainer.getByText('Test note')).toBeVisible();

		// Focus the editor
		await editor.codeMirrorEditor.click();

		// Type some text
		await mainWindow.keyboard.type('# Test note!');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.type('New note content!');

		// Should render
		const viewerFrame = editor.getNoteViewerIframe();
		await expect(viewerFrame.locator('h1')).toHaveText('Test note!');
	});

	test('should be possible to remove sort order buttons in settings', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// Sort order buttons should be visible by default
		await expect(mainScreen.noteListContainer.locator('[title^="Toggle sort order"]')).toBeVisible();

		// Open settings (check both labels so that this works on MacOS)
		expect(
			await activateMainMenuItem(electronApp, 'Preferences...') || await activateMainMenuItem(electronApp, 'Options'),
		).toBe(true);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		// Open the appearance tab
		await settingsScreen.appearanceTabButton.click();

		// Find the sort order visible checkbox
		const sortOrderVisibleCheckbox = mainWindow.getByLabel(/^Show sort order/);

		await expect(sortOrderVisibleCheckbox).toBeChecked();
		await sortOrderVisibleCheckbox.click();
		await expect(sortOrderVisibleCheckbox).not.toBeChecked();

		// Save settings & close
		await settingsScreen.okayButton.click();
		await mainScreen.waitFor();

		await expect(mainScreen.noteListContainer.locator('[title^="Toggle sort order"]')).not.toBeVisible();
	});
});
