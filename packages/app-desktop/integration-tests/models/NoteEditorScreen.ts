
import { Locator, Page } from '@playwright/test';

export default class NoteEditorPage {
	public readonly codeMirrorEditor: Locator;
	public readonly richTextEditor: Locator;
	public readonly noteTitleInput: Locator;
	public readonly attachFileButton: Locator;
	public readonly toggleEditorsButton: Locator;
	private readonly containerLocator: Locator;

	public constructor(private readonly page: Page) {
		this.containerLocator = page.locator('.rli-editor');
		this.codeMirrorEditor = this.containerLocator.locator('.codeMirrorEditor');
		this.richTextEditor = this.containerLocator.locator('iframe[title="Rich Text Area"]');
		this.noteTitleInput = this.containerLocator.locator('.title-input');
		this.attachFileButton = this.containerLocator.locator('[title^="Attach file"]');
		this.toggleEditorsButton = this.containerLocator.locator('[title^="Toggle editors"]');
	}

	public getNoteViewerIframe() {
		// The note viewer can change content when the note re-renders. As such,
		// a new locator needs to be created after re-renders (and this can't be a
		// static property).
		return this.page.frame({ url: /.*note-viewer[/\\]index.html.*/ });
	}

	public getTinyMCEFrameLocator() {
		// We use frameLocator(':scope') to convert the richTextEditor Locator into
		// a FrameLocator. (:scope selects the locator itself).
		// https://playwright.dev/docs/api/class-framelocator
		return this.richTextEditor.frameLocator(':scope');
	}

	public async waitFor() {
		await this.noteTitleInput.waitFor();
		await this.toggleEditorsButton.waitFor();
	}
}
