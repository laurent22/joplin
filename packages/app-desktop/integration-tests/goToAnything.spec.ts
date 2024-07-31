
import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('goToAnything', () => {
	test('clicking outside of go to anything should close it', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.noteEditor.waitFor();
		const goToAnything = mainScreen.goToAnything;
		await goToAnything.open(electronApp);

		await goToAnything.expectToBeOpen();

		// Click outside of the dialog
		await goToAnything.containerLocator.click({ position: { x: 0, y: 0 } });

		await goToAnything.expectToBeClosed();
	});

	test('pressing escape in go to anything should close it ', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const goToAnything = mainScreen.goToAnything;

		// Pressing Escape to close the dialog should work even if opened multiple times in a row.
		for (let i = 0; i < 3; i++) {
			await goToAnything.open(electronApp);

			await goToAnything.expectToBeOpen();
			await goToAnything.inputLocator.press('Escape');
			await goToAnything.expectToBeClosed();
		}
	});

	test('should be possible to show the set tags dialog from goToAnything', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Test note');

		const goToAnything = mainScreen.goToAnything;
		await goToAnything.open(electronApp);
		await goToAnything.inputLocator.fill(':setTags');

		// Should show a matching command
		await expect(goToAnything.containerLocator.getByText('Tags (setTags)')).toBeAttached();

		await mainWindow.keyboard.press('Enter');
		await goToAnything.expectToBeClosed();

		// Should show the "set tags" dialog
		const setTagsLabel = mainWindow.getByText('Add or remove tags:');
		await expect(setTagsLabel).toBeVisible();
	});
});
