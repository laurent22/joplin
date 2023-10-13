import { Page, Locator } from '@playwright/test';
import NoteEditorScreen from './NoteEditorScreen';

export default class MainScreen {
	public readonly newNoteButton: Locator;
	public readonly noteListContainer: Locator;
	public readonly noteEditor: NoteEditorScreen;

	public constructor(page: Page) {
		this.newNoteButton = page.locator('.new-note-button');
		this.noteListContainer = page.locator('.rli-noteList');
		this.noteEditor = new NoteEditorScreen(page);
	}

	public async waitFor() {
		await this.newNoteButton.waitFor();
		await this.noteEditor.waitFor();
		await this.noteListContainer.waitFor();
	}
}
