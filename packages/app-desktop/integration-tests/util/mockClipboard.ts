import { ElectronApplication } from '@playwright/test';
import { expect } from './test';
import getMainWindow from './getMainWindow';

// Currently only supports mocking reading/writing text
const mockClipboard = async (electronApp: ElectronApplication, clipboardText: string) => {
	const mainWindow = await getMainWindow(electronApp);
	await mainWindow.evaluate(async (clipboardText) => {
		const { clipboard } = require('electron');
		clipboard.writeText = (text: string) => {
			clipboardText = text;
		};
		clipboard.readText = () => {
			return clipboardText;
		};
	}, clipboardText);

	return {
		expectClipboardToMatch: async (text: string) => {
			await expect.poll(async () => {
				return await mainWindow.evaluate(() => {
					return require('electron').clipboard.readText();
				});
			}).toBe(text);
		},
	};
};

export default mockClipboard;
