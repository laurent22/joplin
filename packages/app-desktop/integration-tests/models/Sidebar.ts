import activateMainMenuItem from '../util/activateMainMenuItem';
import type MainScreen from './MainScreen';
import { ElectronApplication, Locator, Page } from '@playwright/test';

export default class Sidebar {
	public readonly container: Locator;

	public constructor(page: Page, private mainScreen: MainScreen) {
		this.container = page.locator('.rli-sideBar');
	}

	public async createNewFolder(title: string) {
		const newFolderButton = this.container.getByRole('button', { name: 'New' });
		await newFolderButton.click();

		const titleInput = this.mainScreen.dialog.getByLabel('Title');
		await titleInput.fill(title);

		const submitButton = this.mainScreen.dialog.getByRole('button', { name: 'OK' });
		await submitButton.click();

		return this.container.getByText(title);
	}

	private async sortBy(electronApp: ElectronApplication, option: string) {
		const success = await activateMainMenuItem(electronApp, option, 'Sort notebooks by');
		if (!success) {
			throw new Error(`Failed to find menu item: ${option}`);
		}
	}

	public async sortByDate(electronApp: ElectronApplication) {
		return this.sortBy(electronApp, 'Updated date');
	}

	public async sortByTitle(electronApp: ElectronApplication) {
		return this.sortBy(electronApp, 'Title');
	}

	public async forceUpdateSorting(electronApp: ElectronApplication) {
		// By default, notebooks will not be in the correct position in the list for about 1 second.
		// Change the notebook list sort order to force an immediate refresh.
		await this.sortByDate(electronApp);
		await this.sortByTitle(electronApp);
	}
}
