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

	test('should sync local search between the viewer and editor', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();
		const noteEditor = mainScreen.noteEditor;

		await mainScreen.createNewNote('Note');

		await noteEditor.focusCodeMirrorEditor();

		await mainWindow.keyboard.type('# Testing');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.type('This is a test of search. `Test inline code`');

		const viewer = noteEditor.getNoteViewerIframe();
		await expect(viewer.locator('h1')).toHaveText('Testing');

		const matches = viewer.locator('mark');
		await expect(matches).toHaveCount(0);

		await mainWindow.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f');
		await expect(noteEditor.editorSearchInput).toBeVisible();

		await noteEditor.editorSearchInput.click();
		await noteEditor.editorSearchInput.fill('test');
		await mainWindow.keyboard.press('Enter');

		// Should show at least one match in the viewer
		await expect(matches).toHaveCount(3);
		await expect(matches.first()).toBeAttached();

		// Should show matches in code regions
		await noteEditor.editorSearchInput.fill('inline code');
		await mainWindow.keyboard.press('Enter');
		await expect(matches).toHaveCount(1);

		// Should continue searching after switching to view-only mode
		await noteEditor.toggleEditorLayoutButton.click();
		await noteEditor.toggleEditorLayoutButton.click();
		await expect(noteEditor.codeMirrorEditor).not.toBeVisible();
		await expect(noteEditor.editorSearchInput).not.toBeVisible();
		await expect(noteEditor.viewerSearchInput).toBeVisible();

		// Should stop searching after closing the search input
		await noteEditor.viewerSearchInput.click();
		await expect(matches).toHaveCount(1);
		await mainWindow.keyboard.press('Escape');
		await expect(noteEditor.viewerSearchInput).not.toBeVisible();
		await expect(matches).toHaveCount(0);

		// After showing the viewer again, search should still be hidden
		await noteEditor.toggleEditorLayoutButton.click();
		await expect(noteEditor.codeMirrorEditor).toBeVisible();
		await expect(noteEditor.editorSearchInput).not.toBeVisible();
	});
});

