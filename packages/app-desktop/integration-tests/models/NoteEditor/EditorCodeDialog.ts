import { Locator, Page } from '@playwright/test';

export default class EditorCodeDialog {
	private readonly dialog: Locator;
	public readonly textArea: Locator;
	public readonly okButton: Locator;

	public constructor(page: Page) {
		this.dialog = page.getByRole('dialog', { name: 'Edit' });
		this.textArea = this.dialog.locator('textarea');
		this.okButton = this.dialog.getByRole('button', { name: 'OK' });
	}

	public async waitFor() {
		await this.dialog.waitFor();
		await this.textArea.waitFor();
	}

	public async submit() {
		await this.okButton.click();
	}
}
