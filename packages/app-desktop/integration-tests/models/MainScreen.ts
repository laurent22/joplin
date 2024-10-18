import { Page, Locator, ElectronApplication } from '@playwright/test';
import NoteEditorScreen from './NoteEditorScreen';
import activateMainMenuItem from '../util/activateMainMenuItem';
import Sidebar from './Sidebar';
import GoToAnything from './GoToAnything';
import setFilePickerResponse from '../util/setFilePickerResponse';
import NoteList from './NoteList';
import { expect } from '../util/test';

export default class MainScreen {
	public readonly newNoteButton: Locator;
	public readonly noteList: NoteList;
	public readonly sidebar: Sidebar;
	public readonly dialog: Locator;
	public readonly noteEditor: NoteEditorScreen;
	public readonly goToAnything: GoToAnything;

	public constructor(private page: Page) {
		this.newNoteButton = page.locator('.new-note-button');
		this.noteList = new NoteList(page);
		this.sidebar = new Sidebar(page, this);
		this.dialog = page.locator('.dialog-modal-layer');
		this.noteEditor = new NoteEditorScreen(page);
		this.goToAnything = new GoToAnything(page, this);
	}

	public async waitFor() {
		await this.newNoteButton.waitFor();
		await this.noteList.waitFor();
	}

	// Follows the steps a user would use to create a new note.
	public async createNewNote(title: string) {
		await this.waitFor();

		await this.newNoteButton.click();
		await expect(this.noteEditor.noteTitleInput).toHaveValue('');
		await expect(this.noteEditor.noteTitleInput).toHaveJSProperty('placeholder', 'Creating new note...');

		// Fill the title
		await this.noteEditor.noteTitleInput.click();
		await this.noteEditor.noteTitleInput.fill(title);

		return this.noteEditor;
	}

	public async openSettings(electronApp: ElectronApplication) {
		// Check both labels so this works on MacOS
		await activateMainMenuItem(electronApp, /^(Preferences\.\.\.|Options)$/);
	}

	public async search(text: string) {
		const searchBar = this.page.getByPlaceholder('Search...');
		await searchBar.fill(text);
	}

	public async importHtmlDirectory(electronApp: ElectronApplication, path: string) {
		await setFilePickerResponse(electronApp, [path]);
		await activateMainMenuItem(electronApp, 'HTML - HTML document (Directory)', 'Import');
	}
}
