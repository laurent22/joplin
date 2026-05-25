
// Currently only supports mocking reading/writing text
import { clipboard as clipboard_41 } from 'electron';
import { clipboard } from 'electron';
import { ElectronApplication } from '@playwright/test';
import { expect } from './test';
import getMainWindow from './getMainWindow';
const mockClipboard = async (electronApp: ElectronApplication, clipboardText: string) => {
	const mainWindow = await getMainWindow(electronApp);
	await mainWindow.evaluate(async (clipboardText) => {
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
					return clipboard_41.readText();
				});
			}).toBe(text);
		},
	};
};

export default mockClipboard;
