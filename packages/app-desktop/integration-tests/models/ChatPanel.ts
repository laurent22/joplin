import { ElectronApplication, Locator, Page } from '@playwright/test';
import setSettingValue from '../util/setSettingValue';
import MainScreen from './MainScreen';
import { expect } from '../util/test';

export default class ChatPanel {
	public readonly container: Locator;
	public readonly textInput: Locator;

	public constructor(private page_: Page, private mainScreen_: MainScreen) {
		this.container = page_.getByRole('region', { name: 'AI Chat' });
		this.textInput = page_.getByRole('textbox', { name: 'Chat message' });
	}

	public async configure(electronApp: ElectronApplication) {
		await setSettingValue(electronApp, this.page_, 'ai.enabled', true);
		await setSettingValue(electronApp, this.page_, 'ai.allowRemote', true);
		await setSettingValue(electronApp, this.page_, 'ai.chat.providerType', 'test-provider');
	}

	public async open(electronApp: ElectronApplication) {
		await this.mainScreen_.goToAnything.runCommand(electronApp, 'toggleAiChat');
		await this.container.waitFor();
	}

	public async sendMessage(message: string) {
		await this.textInput.fill(message);
		await this.textInput.press('Enter');
	}

	public async waitForMessageCount(count: number) {
		await expect(this.container.locator('.chat-message.turn')).toHaveCount(count);
	}
}
