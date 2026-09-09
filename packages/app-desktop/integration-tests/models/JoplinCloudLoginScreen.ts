import { Locator, Page } from '@playwright/test';

export default class JoplinCloudLoginScreen {
	public readonly copyLinkToWebsiteLocator: Locator;
	public constructor(private page_: Page) {
		this.copyLinkToWebsiteLocator = this.page_.getByRole('button', { name: 'Copy link to website' });
	}

	public async waitFor() {
		await this.copyLinkToWebsiteLocator.waitFor();
	}
}
