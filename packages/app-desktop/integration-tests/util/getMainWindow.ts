import { ElectronApplication, Page } from '@playwright/test';

// The app may open a splash screen (splash.html) before the main
// window (index.html). This helper waits for the actual main window.
const getMainWindow = async (electronApp: ElectronApplication) => {
	const isMainWindow = (page: Page) => page.url().includes('index.html');

	for (const page of electronApp.windows()) {
		if (isMainWindow(page)) return page;
	}

	return new Promise<Page>((resolve) => {
		const onWindow = async (page: Page) => {
			try {
				// cspell:disable-next-line
				await page.waitForLoadState('domcontentloaded');
			} catch {
				// Window closed before load (e.g. splash dismissed)
				return;
			}
			if (isMainWindow(page)) {
				electronApp.off('window', onWindow);
				resolve(page);
			}
		};
		electronApp.on('window', onWindow);
	});
};

export default getMainWindow;
