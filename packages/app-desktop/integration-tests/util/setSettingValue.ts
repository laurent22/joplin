import { SettingValueType } from '@joplin/lib/models/Setting';
import { ElectronApplication, Page } from '@playwright/test';
import { BrowserWindow } from 'electron';

const setSettingValue = async <Key extends string> (
	app: ElectronApplication, mainWindow: Page, key: Key, value: SettingValueType<Key>,
) => {
	const browserWindow = await app.browserWindow(mainWindow);
	await browserWindow.evaluateHandle((browserWindow: BrowserWindow, { key, value }) => {
		browserWindow.webContents.send('testing--setSetting', key, value);
	}, { key, value });
};

export default setSettingValue;
