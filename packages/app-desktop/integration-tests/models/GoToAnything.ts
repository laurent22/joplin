
import { ElectronApplication, expect, Locator, Page } from '@playwright/test';
import MainScreen from './MainScreen';
import activateMainMenuItem from '../util/activateMainMenuItem';
import { msleep } from '@joplin/utils/time';

export default class GoToAnything {
	public readonly containerLocator: Locator;
	public readonly inputLocator: Locator;

	public constructor(page: Page, private readonly mainScreen: MainScreen) {
		this.containerLocator = page.locator('.go-to-anything-dialog[open]');
		this.inputLocator = this.containerLocator.getByRole('textbox');
	}

	public async waitFor(timeout?: number) {
		await this.containerLocator.waitFor({ timeout });
	}

	public async open(electronApp: ElectronApplication) {
		await this.mainScreen.waitFor();

		// The menu item toggles the dialog, so retrying unconditionally would close a dialog
		// that a previous slow attempt had just opened.
		await expect.poll(async () => {
			if (await this.containerLocator.isVisible()) return true;

			await activateMainMenuItem(electronApp, 'Goto Anything...');
			try {
				await this.waitFor(5_000);
			} catch (error) {
				return false;
			}
			return true;
		}, {
			timeout: 30_000,
			message: 'should open the Goto Anything dialog',
		}).toBe(true);

		// Filling the controlled input before React attaches onChange silently drops the text.
		await this.inputLocator.waitFor();
	}

	public async openLinkToNote(electronApp: ElectronApplication) {
		await this.mainScreen.waitFor();
		await activateMainMenuItem(electronApp, 'Link to note...');
		return this.waitFor();
	}

	public resultLocator(resultText: string|RegExp) {
		return this.containerLocator.getByRole('option', { name: resultText });
	}

	public async searchForWithRetry(query: string, resultLocator: Locator) {
		// If note indexing hasn't finished, it's sometimes necessary to search multiple times.
		// This expect.poll retries the search if it initially fails.
		await expect.poll(async () => {
			await this.inputLocator.clear();
			// Pause to help ensure that the change in the search input is detected
			await msleep(300);
			await this.inputLocator.fill(query);
			try {
				await expect(resultLocator).toBeVisible({ timeout: 1000 });
			} catch (error) {
				// Return, rather than throw, the error -- expect.poll doesn't retry
				// if the callback throws.
				return error;
			}
			return true;
		}, { timeout: 15_000 }).toBe(true);
	}

	public async expectToBeClosed() {
		await expect(this.containerLocator).not.toBeAttached();
	}

	public async expectToBeOpen() {
		await expect(this.containerLocator).toBeAttached();
	}

	public async runCommand(electronApp: ElectronApplication, command: string) {
		if (!command.startsWith(':')) {
			command = `:${command}`;
		}

		await this.open(electronApp);
		await this.inputLocator.fill(command);
		await this.containerLocator.locator('.match-highlight').first().waitFor();
		await this.inputLocator.press('Enter');
		await this.expectToBeClosed();
	}
}
