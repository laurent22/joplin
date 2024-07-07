import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import activateMainMenuItem from './util/activateMainMenuItem';
import setMessageBoxResponse from './util/setMessageBoxResponse';

test.describe('noteList', () => {
	test('should be possible to edit notes in a different notebook when searching', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const folderAHeader = await sidebar.createNewFolder('Folder A');
		await expect(folderAHeader).toBeVisible();

		const folderBHeader = await sidebar.createNewFolder('Folder B');
		await expect(folderBHeader).toBeVisible();
		await folderBHeader.click();

		await mainScreen.createNewNote('note-1');

		await folderAHeader.click();
		await mainScreen.createNewNote('note-2');

		// Search for and focus a note different from the folder we were in before searching.
		await mainScreen.search('/note-1');
		const note1Result = mainScreen.noteListContainer.getByText('note-1');
		await expect(note1Result).toBeAttached();
		await note1Result.click();

		// Typing should not cause the note to disappear
		const editor = mainScreen.noteEditor;
		await editor.codeMirrorEditor.click();
		await mainWindow.keyboard.type('[Testing...](http://example.com/)');

		// Wait to render
		await expect(editor.getNoteViewerIframe().locator('a', { hasText: 'Testing...' })).toBeVisible();

		// Updating the title should force the sidebar to update sooner
		await expect(editor.noteTitleInput).toHaveValue('note-1');
	});

	test('shift-delete should ask to permanently delete notes, but only when the note list is focused', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const folderBHeader = await sidebar.createNewFolder('Folder B');
		const folderAHeader = await sidebar.createNewFolder('Folder A');
		await expect(folderAHeader).toBeVisible();

		await mainScreen.createNewNote('test note 1');
		await mainScreen.createNewNote('test note 2');

		await activateMainMenuItem(electronApp, 'Note list', 'Focus');
		await expect(mainScreen.noteListContainer.getByText('test note 1')).toBeVisible();

		await setMessageBoxResponse(electronApp, /^Delete/i);

		const pressShiftDelete = async () => {
			await mainWindow.keyboard.press('Shift');
			await mainWindow.keyboard.press('Delete');
			await mainWindow.keyboard.up('Delete');
			await mainWindow.keyboard.up('Shift');
		};
		await pressShiftDelete();

		await folderBHeader.click();
		await folderAHeader.click();
		await expect(mainScreen.noteListContainer.getByText('test note 2')).not.toBeVisible();

		// Should not delete when the editor is focused
		await mainScreen.noteEditor.focusCodeMirrorEditor();
		await mainWindow.keyboard.type('test');
		await pressShiftDelete();

		await folderBHeader.click();
		await folderAHeader.click();
		await expect(mainScreen.noteListContainer.getByText('test note 1')).toBeVisible();
	});
});
