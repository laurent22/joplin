
import activateMainMenuItem from '../util/activateMainMenuItem';
import type MainScreen from './MainScreen';
import { ElectronApplication, Locator, Page } from '@playwright/test';

export default class Sidebar {
	public readonly container: Locator;

	public constructor(page: Page, private mainScreen: MainScreen) {
		this.container = page.locator('.rli-sideBar');
	}

	public async createNewNotebook(title: string) {
		const newNotebookButton = this.container.getByRole('button', { name: 'New' });
		await newNotebookButton.click();

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
}
