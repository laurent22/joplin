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
});

