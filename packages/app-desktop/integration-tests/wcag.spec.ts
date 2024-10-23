import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';
import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';

const createScanner = (page: Page) => {
	return new AxeBuilder({ page })
		.disableRules(['page-has-heading-one'])
		.setLegacyMode(true);
};

const expectNoViolations = async (page: Page) => {
	const results = await createScanner(page).analyze();
	expect(results.violations).toEqual([]);
};

test.describe('wcag', () => {
	for (const tabName of ['General', 'Plugins']) {
		test(`should not detect significant issues in the settings screen ${tabName} tab`, async ({ electronApp, mainWindow }) => {
			const mainScreen = new MainScreen(mainWindow);
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
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// For now, activate all notes to make it active. When inactive, it causes a contrast warning.
		// This seems to be allowed under WCAG 2.2 SC 1.4.3 under the "Incidental" exception.
		await mainScreen.sidebar.allNotes.click();
		await mainScreen.createNewNote('Test');

		const results = await createScanner(mainWindow)
			.analyze();
		expect(results.violations).toEqual([]);
	});
});

