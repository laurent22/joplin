
import { Page, Locator } from '@playwright/test';

export default class SettingsScreen {
	private readonly container: Locator;
	public readonly okayButton: Locator;
	public readonly appearanceTabButton: Locator;

	public constructor(page: Page) {
		this.container = page.locator('.config-screen');
		this.okayButton = this.container.locator('.button-bar button', { hasText: 'OK' });
		this.appearanceTabButton = this.getTabLocator('Appearance');
	}

	public getTabLocator(tabName: string) {
		return this.container.locator('.settings-sidebar').getByRole('link', { name: tabName });
	}

	public getLastTab() {
		return this.container.locator('.settings-sidebar').locator('a[id^="setting-tab-"]').last();
	}

	public async waitFor() {
		await this.okayButton.waitFor();
		await this.appearanceTabButton.waitFor();
	}
}
