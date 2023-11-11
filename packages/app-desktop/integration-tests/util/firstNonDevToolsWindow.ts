import { ElectronApplication, Page } from '@playwright/test';

const isDevTools = async (page: Page) => {
	// It seems that the developer tools window can have titles in different
	// formats (e.g. DevTools, Developer Tools).
	return (await page.title()).match(/Dev(eloper)?\s*Tools/i);
};

const firstNonDevToolsWindow = async (electronApp: ElectronApplication) => {
	// Wait for the window event as soon as possible -- it's possible that
	// the window we want will be shown while doing other async checks.
	const nextNonDevToolsPage = electronApp.waitForEvent('window', {
		predicate: async page => {
			return !(await isDevTools(page));
		},
	});

	// First use firstWindow -- it's possible that the first window
	// has already been shown.
	let mainWindow = await electronApp.firstWindow();

	if (await isDevTools(mainWindow)) {
		for (const window of electronApp.windows()) {
			if (!(await isDevTools(window))) {
				mainWindow = window;
				break;
			}
		}

		if (await isDevTools(mainWindow)) {
			mainWindow = await nextNonDevToolsPage;
		}
	}

	// waitForEvent will throw if no additional windows are created.
	// Ignore.
	// eslint-disable-next-line promise/prefer-await-to-then
	nextNonDevToolsPage.catch(_error => {});

	return mainWindow;
};

export default firstNonDevToolsWindow;
