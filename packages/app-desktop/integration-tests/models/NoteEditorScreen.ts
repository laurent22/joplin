
import { Locator, Page } from '@playwright/test';
import { expect } from '../util/test';

export default class NoteEditorPage {
	public readonly codeMirrorEditor: Locator;
	public readonly noteViewerContainer: Locator;
	public readonly richTextEditor: Locator;
	public readonly noteTitleInput: Locator;
	public readonly attachFileButton: Locator;
	public readonly toggleEditorsButton: Locator;
	public readonly toggleEditorLayoutButton: Locator;
	public readonly editorSearchInput: Locator;
	public readonly viewerSearchInput: Locator;
	private readonly containerLocator: Locator;

	public constructor(page: Page) {
		this.containerLocator = page.locator('.rli-editor');
		this.codeMirrorEditor = this.containerLocator.locator('.cm-editor');
		this.richTextEditor = this.containerLocator.locator('iframe[title="Rich Text Area"]');
		this.noteTitleInput = this.containerLocator.locator('.title-input');
		this.attachFileButton = this.containerLocator.getByRole('button', { name: 'Attach file' });
		this.toggleEditorsButton = this.containerLocator.getByRole('button', { name: 'Toggle editors' });
		this.toggleEditorLayoutButton = this.containerLocator.getByRole('button', { name: 'Toggle editor layout' });
		this.noteViewerContainer = this.containerLocator.locator('iframe[src$="note-viewer/index.html"]');
		// The editor and viewer have slightly different search UI
		this.editorSearchInput = this.containerLocator.getByPlaceholder('Find');
		this.viewerSearchInput = this.containerLocator.getByPlaceholder('Search...');
	}

	public toolbarButtonLocator(title: string) {
		return this.containerLocator.getByRole('button', { name: title });
	}

	public async contentLocator() {
		const richTextBody = this.getRichTextFrameLocator().locator('body');
		const markdownEditor = this.codeMirrorEditor;

		// Work around an issue where .or doesn't work with frameLocators.
		// See https://github.com/microsoft/playwright/issues/27688#issuecomment-1771403495
		await Promise.race([
			richTextBody.waitFor({ state: 'visible' }).catch(()=>{}),
			markdownEditor.waitFor({ state: 'visible' }).catch(()=>{}),
		]);
		if (await richTextBody.isVisible()) {
			return richTextBody;
		} else {
			return markdownEditor;
		}
	}

	public async expectToHaveText(content: string) {
		// expect(...).toHaveText can fail in the Rich Text Editor (perhaps due to frame locators).
		// Using expect.poll refreshes the locator on each attempt, which seems to prevent flakiness.
		await expect.poll(
			async () => (await this.contentLocator()).textContent(),
		).toBe(content);
	}

	public getNoteViewerFrameLocator() {
		// The note viewer can change content when the note re-renders. As such,
		// a new locator needs to be created after re-renders (and this can't be a
		// static property).
		return this.noteViewerContainer.frameLocator(':scope');
	}

	public getRichTextFrameLocator() {
		// We use frameLocator(':scope') to convert the richTextEditor Locator into
		// a FrameLocator. (:scope selects the locator itself).
		// https://playwright.dev/docs/api/class-framelocator
		return this.richTextEditor.frameLocator(':scope');
	}

	public focusCodeMirrorEditor() {
		return this.codeMirrorEditor.click();
	}

	public async waitFor() {
		await this.noteTitleInput.waitFor();
		await this.toggleEditorsButton.waitFor();
	}

	public async goBack() {
		const backButton = this.toolbarButtonLocator('Back');
		await expect(backButton).not.toBeDisabled();
		await backButton.click();
	}
}
