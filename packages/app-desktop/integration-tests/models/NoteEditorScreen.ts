
import { Locator, Page } from '@playwright/test';

export default class NoteEditorPage {
	public readonly codeMirrorEditor: Locator;
	public readonly noteTitleInput: Locator;
	private readonly containerLocator: Locator;

	public constructor(private readonly page: Page) {
		this.containerLocator = page.locator('.rli-editor');
		this.codeMirrorEditor = this.containerLocator.locator('.codeMirrorEditor');
		this.noteTitleInput = this.containerLocator.locator('.title-input');
	}

	public getNoteViewerIframe() {
		// The note viewer can change content when the note re-renders. As such,
		// a new locator needs to be created after re-renders (and this can't be a
		// static property).
		return this.page.frame({ url: /.*note-viewer[/\\]index.html.*/ });
	}

	public async waitFor() {
		await this.codeMirrorEditor.waitFor();
		await this.noteTitleInput.waitFor();
	}
}
