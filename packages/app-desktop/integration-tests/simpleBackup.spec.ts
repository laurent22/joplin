import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';
import activateMainMenuItem from './util/activateMainMenuItem';

test.describe('simpleBackup', () => {
	// Grouping both the check for a settings section and attempting to create
	// a backup makes the test less flaky.
	// Navigating to settings first allows us to wait for the "Create backup" section
	// to load.
	test('should have a section in settings and backups should work', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// Open settings (check both labels so that this works on MacOS)
		await mainScreen.openSettings(electronApp);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		const backupTab = settingsScreen.getTabLocator('Backup');
		await backupTab.waitFor();

		await settingsScreen.backButton.click();
		await mainScreen.waitFor();

		// Backups should work
		expect(await activateMainMenuItem(electronApp, 'Create backup')).toBe(true);

		const successDialog = mainWindow.locator('iframe[id$=backup-backupDialog]');
		await successDialog.waitFor();

		// Should report success
		const dialogContentLocator = successDialog.frameLocator(':scope');
		await dialogContentLocator.getByText('Backup completed').waitFor();
	});
});

