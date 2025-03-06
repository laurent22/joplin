
import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import { Locator } from '@playwright/test';

test.describe('goToAnything', () => {
	test('clicking outside of go to anything should close it', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Test');
		await mainScreen.noteEditor.waitFor();
		const goToAnything = mainScreen.goToAnything;
		await goToAnything.open(electronApp);

		await goToAnything.expectToBeOpen();

		// Click outside of the dialog
		await goToAnything.containerLocator.click({ position: { x: 0, y: 0 } });

		await goToAnything.expectToBeClosed();
	});

	test('pressing escape in go to anything should close it ', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		const goToAnything = mainScreen.goToAnything;

		// Pressing Escape to close the dialog should work even if opened multiple times in a row.
		for (let i = 0; i < 3; i++) {
			await goToAnything.open(electronApp);

			await goToAnything.expectToBeOpen();
			await goToAnything.inputLocator.press('Escape');
			await goToAnything.expectToBeClosed();
		}
	});

	test('closing go to anything should restore the original keyboard focus', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('');

		const initialFocusLocators: [Locator, boolean][] = [
			[mainScreen.noteEditor.noteTitleInput, true],
			[mainScreen.noteEditor.codeMirrorEditor, false],
		];

		// Focus and start to fill the editor
		for (const [originalFocusLocator, isInput] of initialFocusLocators) {
			await originalFocusLocator.click();
			await mainWindow.keyboard.type('Test');

			const goToAnything = mainScreen.goToAnything;
			await goToAnything.open(electronApp);

			await goToAnything.expectToBeOpen();
			await goToAnything.inputLocator.press('Escape');
			await goToAnything.expectToBeClosed();

			// Keyboard focus should have returned to the editor
			await mainWindow.keyboard.type('ing...');
			if (isInput) {
				await expect(originalFocusLocator).toBeFocused();
				await expect(originalFocusLocator).toHaveValue('Testing...');
			} else {
				await expect(originalFocusLocator).toHaveText('Testing...');
			}
		}
	});

	test('should be possible to show the set tags dialog from goToAnything', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
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
