import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';
import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';

const createScanner = (page: Page) => {
	return new AxeBuilder({ page })
		.disableRules(['page-has-heading-one'])
		// Needed because we're using Electron. See https://github.com/dequelabs/axe-core-npm/issues/1141
		.setLegacyMode(true);
};

// Fade-in transitions can cause color contrast issues if still running
// during a scan.
// See https://github.com/dequelabs/axe-core-npm/issues/952
const waitForAnimationsToEnd = (page: Page) => {
	return page.locator('body').evaluate(element => {
		const animationPromises = element
			.getAnimations({ subtree: true })
			.map(animation => animation.finished);
		return Promise.all(animationPromises);
	});
};

const expectNoViolations = async (page: Page) => {
	await waitForAnimationsToEnd(page);
	const results = await createScanner(page).analyze();
	expect(results.violations).toEqual([]);
};


test.describe('wcag', () => {
	for (const tabName of ['General', 'Plugins']) {
		test(`should not detect significant issues in the settings screen ${tabName} tab`, async ({ electronApp, mainWindow }) => {
			const mainScreen = await new MainScreen(mainWindow).setup();
			await mainScreen.waitFor();

			await mainScreen.openSettings(electronApp);

			// Should be on the settings screen
			const settingsScreen = new SettingsScreen(mainWindow);
			await settingsScreen.waitFor();

			const tabLocator = settingsScreen.getTabLocator(tabName);
			await tabLocator.click();
			await expect(tabLocator).toBeFocused();

			await expectNoViolations(mainWindow);
		});
	}

	test('should not detect significant issues in the main screen with an open note', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		await mainScreen.createNewNote('Test');

		// Ensure that `:hover` styling is consistent between tests:
		await mainScreen.noteEditor.noteTitleInput.hover();

		await expectNoViolations(mainWindow);

		// Should not find issues with the Rich Text Editor
		await mainScreen.noteEditor.toggleEditorsButton.click();
		await mainScreen.noteEditor.richTextEditor.click();

		await expectNoViolations(mainWindow);
	});

	test('should not detect significant issues in the change app layout screen', async ({ mainWindow, electronApp }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.changeLayoutScreen.open(electronApp);
		await expectNoViolations(mainWindow);
	});
});

