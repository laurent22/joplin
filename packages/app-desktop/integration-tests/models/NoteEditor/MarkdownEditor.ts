import { Locator } from '@playwright/test';
import BaseEditor from './BaseEditor';

export default class MarkdownEditor implements BaseEditor {
	public readonly container: Locator;
	public readonly content: Locator;
	public constructor(parent: Locator) {
		this.container = parent.locator('.CodeMirror');
		this.content = this.container.locator('[contentEditable]');
	}

	public async waitFor() {
		await this.container.waitFor();
	}

	public async pressKey(text: string) {
		await this.content.press(text);
	}

	public async typeText(text: string) {
		await this.focusContent();
		await this.content.pressSequentially(text);
	}

	public async focusContent() {
		// eslint-disable-next-line no-restricted-properties -- The focusHandler wrapper can't be used here, since Playwright's focus needs to be awaited
		await this.content.focus();
	}

	public async innerText() {
		return this.content.innerText();
	}
}
