import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';

test.describe('settings', () => {
	test('should be possible to remove sort order buttons in settings', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();

		// Sort order buttons should be visible by default
		const sortOrderLocator = mainScreen.noteList.sortOrderButton;
		await expect(sortOrderLocator).toBeVisible();

		await mainScreen.openSettings(electronApp);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		// Open the appearance tab
		await settingsScreen.appearanceTabButton.click();

		// Find the sort order visible checkbox
		const sortOrderVisibleCheckbox = mainWindow.getByLabel(/^Show sort order/);

		await expect(sortOrderVisibleCheckbox).toBeChecked();
		await sortOrderVisibleCheckbox.click();
		await expect(sortOrderVisibleCheckbox).not.toBeChecked();

		// Save settings & close
		await settingsScreen.okayButton.click();
		await mainScreen.waitFor();

		await expect(sortOrderLocator).not.toBeVisible();
	});

	test('clicking the sync wizard button in settings should open a dialog', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.waitFor();
		await mainScreen.openSettings(electronApp);

		const settingsScreen = new SettingsScreen(mainWindow);
		const generalTab = settingsScreen.getTabLocator('Synchronisation');
		await generalTab.click();

		await expect(mainScreen.dialog).not.toBeVisible();

		const syncWizardButton = mainWindow.getByRole('button', { name: 'Open Sync Wizard' });
		await syncWizardButton.click();

		await expect(mainScreen.dialog).toBeVisible();
	});

	test('should be possible to navigate settings screen tabs with the arrow keys', async ({ electronApp, mainWindow, startupPluginsLoaded }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await startupPluginsLoaded;

		await mainScreen.waitFor();
		await mainScreen.openSettings(electronApp);

		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		const generalTab = settingsScreen.getTabLocator('General');
		await generalTab.click();

		const focusedItem = mainWindow.locator(':focus');

		// Up/Down arrows should move to the next and previous items
		await expect(focusedItem).toHaveText('General');
		await mainWindow.keyboard.press('ArrowDown');
		await expect(focusedItem).toHaveText('Application');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(focusedItem).toHaveText('General');

		// Pressing Up when the first item is focused should focus the last item
		await mainWindow.keyboard.press('ArrowUp');
		await expect(settingsScreen.getLastTab()).toBeFocused();

		await mainWindow.keyboard.press('ArrowDown');
		await mainWindow.keyboard.press('ArrowDown');

		await expect(focusedItem).toHaveText('Application');

		// Pressing Tab should focus the tab container
		await mainWindow.keyboard.press('Tab');
		await expect(focusedItem).toHaveAttribute('role', 'tabpanel');

		// The correct tab should be visible
		await expect(mainWindow.getByLabel('Show tray icon')).toBeVisible();

		// Shift+Tab should focus the sidebar again
		await mainWindow.keyboard.press('Shift+Tab');
		await expect(focusedItem).toHaveAttribute('role', 'tab');
		await expect(focusedItem).toHaveText('Application');
	});
});

