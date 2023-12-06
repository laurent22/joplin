import { Page, Locator } from '@playwright/test';
import NoteEditorScreen from './NoteEditorScreen';

export default class MainScreen {
	public readonly newNoteButton: Locator;
	public readonly noteListContainer: Locator;
	public readonly noteEditor: NoteEditorScreen;

	public constructor(private page: Page) {
		this.newNoteButton = page.locator('.new-note-button');
		this.noteListContainer = page.locator('.rli-noteList');
		this.noteEditor = new NoteEditorScreen(page);
	}

	public async waitFor() {
		await this.newNoteButton.waitFor();
		await this.noteEditor.waitFor();
		await this.noteListContainer.waitFor();
	}

	// Follows the steps a user would use to create a new note.
	public async createNewNote(title: string) {
		await this.waitFor();
		await this.newNoteButton.click();
		await this.noteEditor.waitFor();

		// Wait for the title input to have the correct placeholder
		await this.page.locator('input[placeholder^="Creating new note"]').waitFor();

		// Fill the title
		await this.noteEditor.noteTitleInput.click();
		await this.noteEditor.noteTitleInput.fill(title);

		return this.noteEditor;
	}
}
