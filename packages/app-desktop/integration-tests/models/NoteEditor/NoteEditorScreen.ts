import { ElectronApplication, Locator, Page } from '@playwright/test';
import { expect } from '../../util/test';
import activateMainMenuItem from '../../util/activateMainMenuItem';
import setSettingValue from '../../util/setSettingValue';
import NoteViewer from './NoteViewer';
import MarkdownEditor from './MarkdownEditor';
import RichTextEditor from './RichTextEditor';

export default class NoteEditorScreen {
	public readonly editorPluginFrame: Locator;
	public readonly noteTitleInput: Locator;

	public readonly attachFileButton: Locator;
	public readonly toggleCodeBlockButton: Locator;
	public readonly toggleEditorsButton: Locator;
	public readonly toggleEditorLayoutButton: Locator;
	private readonly disableTabNavigationButton: Locator;
	public readonly toggleEditorPluginButton: Locator;

	public readonly editorSearchInput: Locator;
	public readonly viewerSearchInput: Locator;

	private readonly containerLocator: Locator;

	private readonly noteViewer_: NoteViewer;
	private readonly markdownEditor_: MarkdownEditor;
	private readonly richTextEditor_: RichTextEditor;

	public constructor(private page_: Page) {
		// .rli-editor is used in the main window, .note-editor-wrapper in secondary windows
		this.containerLocator = page_.locator('.rli-editor, .note-editor-wrapper');
		this.noteViewer_ = new NoteViewer(this.containerLocator);
		this.markdownEditor_ = new MarkdownEditor(this.containerLocator);
		this.richTextEditor_ = new RichTextEditor(this.containerLocator, page_);
		this.editorPluginFrame = this.containerLocator.locator('iframe[id^="plugin-view-"]');
		this.noteTitleInput = this.containerLocator.locator('.title-input');
		this.attachFileButton = this.containerLocator.getByRole('button', { name: 'Attach file' });
		this.toggleCodeBlockButton = this.containerLocator.getByRole('button', { name: 'Code Block' });
		this.toggleEditorsButton = this.containerLocator.getByRole('button', { name: 'Toggle editors', exact: true });
		this.toggleEditorLayoutButton = this.containerLocator.getByRole('button', { name: 'Toggle editor layout' });
		// The editor and viewer have slightly different search UI
		this.editorSearchInput = this.containerLocator.getByPlaceholder('Find');
		this.viewerSearchInput = this.containerLocator.getByPlaceholder('Search...');
		this.disableTabNavigationButton = this.containerLocator.getByRole('button', { name: 'Tab moves focus' });
		this.toggleEditorPluginButton = this.containerLocator.getByRole('button', { name: 'Toggle editor plugin' });
	}

	public async waitFor() {
		await this.contentLocator_();
		await this.noteTitleInput.waitFor();
		await this.toggleEditorsButton.waitFor();
	}

	public async undo(electronApp: ElectronApplication) {
		await activateMainMenuItem(electronApp, 'Undo');
	}

	public toolbarButtonLocator(title: string) {
		return this.containerLocator.getByRole('button', { name: title });
	}

	private async markdownEditorActive() {
		await this.toggleEditorsButton.waitFor();
		return this.toggleEditorsButton.evaluate(element => element.classList.contains('markdown-active'));
	}

	private async showMarkdownEditorOrViewer_() {
		if (!await this.markdownEditorActive()) {
			await this.toggleEditorsButton.click();
		}

		await Promise.race([
			this.markdownEditor_.waitFor().catch(() => {}),
			this.noteViewer_.waitFor().catch(() => {}),
		]);
	}

	public async showNoteViewerAndMarkdownEditor() {
		await this.showMarkdownEditorOrViewer_();

		const noteViewerVisible = await this.noteViewer_.container.isVisible();
		const noteEditorVisible = await this.markdownEditor_.container.isVisible();

		if (noteViewerVisible && !noteEditorVisible) {
			await this.toggleEditorLayout();
		} else if (!noteViewerVisible && noteEditorVisible) {
			await this.toggleEditorLayout();
			await expect(this.noteViewer_.container).toBeVisible();
			await expect(this.markdownEditor_.content).not.toBeVisible();
			await this.toggleEditorLayout();
		}

		await expect(this.noteViewer_.container).toBeVisible();
		await expect(this.markdownEditor_.content).toBeVisible();

		return { viewer: this.noteViewer_, editor: this.markdownEditor_ };
	}

	public async showNoteViewer() {
		await this.showMarkdownEditorOrViewer_();

		if (!await this.noteViewer_.container.isVisible()) {
			await this.toggleEditorLayout();
		}

		return this.noteViewer_;
	}

	public async showMarkdownEditor() {
		await this.showMarkdownEditorOrViewer_();

		if (!await this.markdownEditor_.container.isVisible()) {
			await this.toggleEditorLayout();
		}

		return this.markdownEditor_;
	}

	public async showRichTextEditor() {
		if (await this.markdownEditorActive()) {
			await this.toggleEditorsButton.click();
		}
		await this.richTextEditor_.waitFor();
		return this.richTextEditor_;
	}

	private async contentLocator_() {
		const richTextBody = this.richTextEditor_.content.locator('body');
		const markdownEditor = this.markdownEditor_.container;
		const noteViewer = this.noteViewer_.container;

		// Work around an issue where .or doesn't work with frameLocators.
		// See https://github.com/microsoft/playwright/issues/27688#issuecomment-1771403495
		await Promise.race([
			richTextBody.waitFor({ state: 'visible' }).catch(()=>{}),
			markdownEditor.waitFor({ state: 'visible' }).catch(()=>{}),
			noteViewer.waitFor({ state: 'visible' }).catch(() => {}),
		]);
		if (await richTextBody.isVisible()) {
			return richTextBody;
		} else if (await markdownEditor.isVisible()) {
			return markdownEditor;
		} else {
			return noteViewer;
		}
	}

	public async disableInlineRendering(electronApp: ElectronApplication) {
		await setSettingValue(electronApp, this.page_, 'editor.inlineRendering', false);
	}

	public async expectToHaveText(expected: string|RegExp) {
		// expect(...).toHaveText can fail in the Rich Text Editor (perhaps due to frame locators).
		// Using expect.poll refreshes the locator on each attempt, which seems to prevent flakiness.
		const expectResult = expect.poll(
			// Use .innerText: textContent doesn't handle line breaks correctly in the CodeMirror
			// editor.
			async () => (await this.contentLocator_()).innerText(),
		);
		// Allow `expected` to be either an exact match (a string) or a pattern
		if (typeof expected === 'string') {
			await expectResult.toBe(expected);
		} else {
			await expectResult.toMatch(expected);
		}
	}

	public async enableTabNavigation(electronApp: ElectronApplication) {
		await expect(this.disableTabNavigationButton).not.toBeVisible();
		await activateMainMenuItem(electronApp, 'Tab moves focus');
		await expect(this.disableTabNavigationButton).toBeVisible();
	}

	public async disableTabNavigation(electronApp: ElectronApplication) {
		await expect(this.disableTabNavigationButton).toBeVisible();
		await activateMainMenuItem(electronApp, 'Tab moves focus');
		await expect(this.disableTabNavigationButton).not.toBeVisible();
	}

	public async goBack() {
		const backButton = this.toolbarButtonLocator('Back');
		await expect(backButton).not.toBeDisabled();
		await backButton.click();
	}

	public async toggleEditorLayout() {
		await this.toggleEditorLayoutButton.click();
	}

	public async hideViewer() {
		const editorVisible = await this.markdownEditor_.container.isVisible();
		await expect(this.noteViewer_.container).toBeVisible();
		await this.toggleEditorLayout();

		// An additional toggle was needed if initially in viewer-only mode
		if (!editorVisible) {
			await expect(this.markdownEditor_.container).toBeVisible();
			await this.toggleEditorLayout();
		}

		await expect(this.noteViewer_.container).not.toBeVisible();
	}
}
