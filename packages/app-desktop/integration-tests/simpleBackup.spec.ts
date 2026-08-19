import { test } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';
import activateMainMenuItem from './util/activateMainMenuItem';

test.describe('simpleBackup', () => {
	test('should have a section in settings', async ({ electronApp, startupPluginsLoaded, mainWindow }) => {
		await startupPluginsLoaded;

		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		// Open settings (check both labels so that this works on MacOS)
		await mainScreen.openSettings(electronApp);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		const backupTab = settingsScreen.getTabLocator('Backup');
		await backupTab.waitFor();
	});

	test('should be possible to create a backup', async ({ electronApp, startupPluginsLoaded, mainWindow }) => {
		await startupPluginsLoaded;

		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		// Backups should work
		await activateMainMenuItem(electronApp, 'Create backup');

		const successDialog = mainWindow.locator('iframe[id$=backup-backupDialog]');
		await successDialog.waitFor();

		// Should report success
		const dialogContentLocator = successDialog.frameLocator(':scope');
		await dialogContentLocator.getByText('Backup completed').waitFor();
	});
});

