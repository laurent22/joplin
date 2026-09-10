import { FrameLocator, Locator, Page } from '@playwright/test';
import BaseEditor from './BaseEditor';
import EditorCodeDialog from './EditorCodeDialog';

export default class RichTextEditor implements BaseEditor {
	public readonly container: Locator;
	public readonly content: FrameLocator;
	public readonly codeEditor: EditorCodeDialog;
	public readonly body: Locator;

	public constructor(parent: Locator, page: Page) {
		this.container = parent.locator('iframe[title="Rich Text Area"]');
		this.content = this.container.contentFrame();
		this.codeEditor = new EditorCodeDialog(page);
		this.body = this.content.locator('body');
	}

	public async waitFor() {
		await this.container.waitFor();
		await this.content.locator('body').waitFor();
	}

	public async focusContent() {
		// eslint-disable-next-line no-restricted-properties -- The focusHandler wrapper can't be used here, since Playwright's focus needs to be awaited
		await this.body.focus();
	}

	public async typeText(text: string) {
		await this.body.waitFor();
		await this.focusContent();
		await this.body.pressSequentially(text);
	}

	public async getSearchMatches() {
		return this.body.evaluate(() => {
			const highlights = CSS.highlights.get('jop-search-highlight') ?? new Set();
			const result = [];
			for (const highlight of highlights) {
				result.push(highlight.toString());
			}
			return result;
		});
	}
}
