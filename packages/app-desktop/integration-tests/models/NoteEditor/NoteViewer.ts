import { FrameLocator, Locator } from '@playwright/test';

export default class NoteViewer {
	public container: Locator;
	public content: FrameLocator;
	public constructor(parent: Locator) {
		this.container = parent.locator('iframe[src$="note-viewer/index.html"]');
		this.content = this.container.contentFrame();
	}

	public async waitFor() {
		await this.container.waitFor();
		await this.content.locator('body').waitFor();
	}
}
