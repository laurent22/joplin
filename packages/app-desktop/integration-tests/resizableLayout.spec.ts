
import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('resizableLayout', () => {
	test('right/left buttons should retain keyboard focus after use', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		const changeLayoutScreen = mainScreen.changeLayoutScreen;
		await changeLayoutScreen.open(electronApp);

		const moveSidebarControls = changeLayoutScreen.containerLocator.getByRole('group', { name: 'Sidebar' });
		const moveSidebarRight = moveSidebarControls.getByRole('button', { name: 'Move right' });

		await expect(moveSidebarRight).not.toBeDisabled();

		// Should refocus (or keep focused) after clicking
		await moveSidebarRight.click();
		await expect(moveSidebarRight).toBeFocused();
		await moveSidebarRight.click();
		await expect(moveSidebarRight).toBeFocused();
	});
});
