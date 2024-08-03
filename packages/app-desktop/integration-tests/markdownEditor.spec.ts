import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import { join } from 'path';
import getImageSourceSize from './util/getImageSourceSize';


test.describe('markdownEditor', () => {
	test('preview pane should render images in HTML notes', async ({ mainWindow, electronApp }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		await mainScreen.importHtmlDirectory(electronApp, join(__dirname, 'resources', 'html-import'));
		const importedFolder = mainScreen.sidebar.container.getByText('html-import');
		await importedFolder.waitFor();
		await importedFolder.click();

		const importedHtmlFileItem = mainScreen.noteListContainer.getByText('test-html-file-with-image');
		await importedHtmlFileItem.click();

		const viewerFrame = mainScreen.noteEditor.getNoteViewerIframe();
		// Should render headers
		await expect(viewerFrame.locator('h1')).toHaveText('Test HTML file!');

		// Should render images
		const image = viewerFrame.getByAltText('An SVG image.');
		await expect(image).toBeAttached();
		await expect(await getImageSourceSize(image)).toMatchObject([117, 30]);
	});

	test('arrow keys should navigate the toolbar', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		await mainScreen.createNewNote('Note 1');
		await mainScreen.createNewNote('Note 2');
		const noteEditor = mainScreen.noteEditor;
		await noteEditor.focusCodeMirrorEditor();

		// Escape, then Shift+Tab should focus the toolbar
		await mainWindow.keyboard.press('Escape');
		await mainWindow.keyboard.press('Shift+Tab');

		// Should focus the first item by default, the "back" arrow (back to "Note 1")
		const firstItemLocator = noteEditor.toolbarButtonLocator('Back');
		await expect(firstItemLocator).toBeFocused();

		// Left arrow should wrap to the end
		await mainWindow.keyboard.press('ArrowLeft');
		const lastItemLocator = noteEditor.toolbarButtonLocator('Toggle editors');
		await expect(lastItemLocator).toBeFocused();

		await mainWindow.keyboard.press('ArrowRight');
		await expect(firstItemLocator).toBeFocused();

		// ArrowRight should skip disabled items (Forward).
		await mainWindow.keyboard.press('ArrowRight');
		await expect(noteEditor.toolbarButtonLocator('Toggle external editing')).toBeFocused();

		// Home/end should navigate to the first/last items
		await mainWindow.keyboard.press('End');
		await expect(lastItemLocator).toBeFocused();

		await mainWindow.keyboard.press('Home');
		await expect(firstItemLocator).toBeFocused();
	});
});

