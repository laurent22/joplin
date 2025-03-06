import activateMainMenuItem from '../util/activateMainMenuItem';
import { ElectronApplication, Locator, Page, expect } from '@playwright/test';

export default class NoteList {
	public readonly container: Locator;
	public readonly sortOrderButton: Locator;

	public constructor(page: Page) {
		this.container = page.locator('.rli-noteList');
		this.sortOrderButton = this.container.getByRole('button', { name: 'Toggle sort order' });
	}

	public waitFor() {
		return this.container.waitFor();
	}

	private async sortBy(electronApp: ElectronApplication, sortMethod: string) {
		await activateMainMenuItem(electronApp, sortMethod, 'Sort notes by');
	}

	public async sortByTitle(electronApp: ElectronApplication) {
		await this.sortBy(electronApp, 'Title');
		await expect(this.sortOrderButton).toHaveAttribute('title', /Toggle sort order field:[\n ]*title ->/);
	}

	public async focusContent(electronApp: ElectronApplication) {
		await activateMainMenuItem(electronApp, 'Note list', 'Focus');
	}

	// The resultant locator may fail to resolve if the item is not visible
	public getNoteItemByTitle(title: string|RegExp) {
		return this.container.getByRole('option', { name: title });
	}

	public async expectNoteToBeSelected(title: string|RegExp) {
		await expect(this.getNoteItemByTitle(title)).toHaveAttribute('aria-selected', 'true');
	}
}
