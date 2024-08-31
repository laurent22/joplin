import activateMainMenuItem from '../util/activateMainMenuItem';
import { ElectronApplication, Locator, Page, expect } from '@playwright/test';

export default class NoteList {
	public readonly container: Locator;

	public constructor(page: Page) {
		this.container = page.locator('.rli-noteList');
	}

	public waitFor() {
		return this.container.waitFor();
	}

	private async sortBy(electronApp: ElectronApplication, sortMethod: string) {
		const success = await activateMainMenuItem(electronApp, sortMethod, 'Sort notes by');
		if (!success) {
			throw new Error(`Unable to find sorting menu item: ${sortMethod}`);
		}
	}

	public async sortByTitle(electronApp: ElectronApplication) {
		return this.sortBy(electronApp, 'Title');
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
