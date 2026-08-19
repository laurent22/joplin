
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
		return this.container.getByRole('tab', { name: tabName });
	}

	public getLastTab() {
		return this.container.getByRole('tablist').getByRole('tab').last();
	}

	public async waitFor() {
		await this.okayButton.waitFor();
		await this.appearanceTabButton.waitFor();
	}
}
