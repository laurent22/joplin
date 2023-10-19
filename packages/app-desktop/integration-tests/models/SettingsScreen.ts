
import { Page, Locator } from '@playwright/test';

export default class SettingsScreen {
	public readonly okayButton: Locator;
	public readonly appearanceTabButton: Locator;

	public constructor(page: Page) {
		this.okayButton = page.locator('button', { hasText: 'OK' });
		this.appearanceTabButton = page.getByText('Appearance');
	}

	public async waitFor() {
		await this.okayButton.waitFor();
		await this.appearanceTabButton.waitFor();
	}
}
