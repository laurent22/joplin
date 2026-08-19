
import { ElectronApplication, Locator, Page } from '@playwright/test';
import MainScreen from './MainScreen';
import activateMainMenuItem from '../util/activateMainMenuItem';

export default class ChangeAppLayoutScreen {
	public readonly containerLocator: Locator;

	public constructor(page: Page, private readonly mainScreen: MainScreen) {
		this.containerLocator = page.locator('.change-app-layout-dialog[open]');
	}

	public async open(electronApp: ElectronApplication) {
		await this.mainScreen.waitFor();
		await activateMainMenuItem(electronApp, 'Change application layout');

		return this.waitFor();
	}

	public async waitFor() {
		await this.containerLocator.waitFor();
	}
}
