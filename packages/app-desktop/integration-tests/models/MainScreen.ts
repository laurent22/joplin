import { Page, Locator } from '@playwright/test';
import NoteEditorScreen from './NoteEditorScreen';

export default class MainPage {
	public readonly newNoteButton: Locator;
	public readonly noteEditor: NoteEditorScreen;
	public readonly noteList: Locator;

	public constructor(page: Page) {
		this.newNoteButton = page.locator('.new-note-button');
		this.noteList = page.locator('.note-list');
		this.noteEditor = new NoteEditorScreen(page);
	}

	public async waitFor() {
		await this.newNoteButton.waitFor();
		await this.noteEditor.waitFor();
		await this.noteList.waitFor();
	}
}
