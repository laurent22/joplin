import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';


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
		await editor.noteTitleInput.fill('Test note');

		// Note list should contain the new note
		await mainScreen.noteList.getByText('Test note').waitFor();

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
});
