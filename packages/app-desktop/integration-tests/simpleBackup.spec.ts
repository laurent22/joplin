import { test } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';


test.describe('simpleBackup', () => {
	test('should have a section in settings', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// Open settings (check both labels so that this works on MacOS)
		await mainScreen.openSettings(electronApp);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		const backupTab = settingsScreen.getTabLocator('Backup');
		await backupTab.waitFor();
	});
});

