import { Second } from '@joplin/utils/time';
import { ElectronApplication, Page } from '@playwright/test';

const waitForNextWindowMatching = (titlePattern: RegExp, electronApp: ElectronApplication) => {
	return new Promise<Page>((resolve, reject) => {
		let timeout: NodeJS.Timeout|null = null;
		const clearListenersAndTimeouts = () => {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			electronApp.off('window', onWindowAdded);
			electronApp.off('close', onClose);
		};

		const onWindowAdded = async (page: Page) => {
			const title = await page.title();
			if (title.match(titlePattern)) {
				clearListenersAndTimeouts();
				resolve(page);
			}
		};
		const onClose = () => {
			clearListenersAndTimeouts();
			reject(new Error('Target application closed.'));
		};

		electronApp.on('window', onWindowAdded);
		electronApp.on('close', onClose);

		timeout = setTimeout(async () => {
			timeout = null;
			clearListenersAndTimeouts();

			const windowTitles = await getOpenWindowTitles(electronApp);
			reject(new Error(`Opening a window timed out. Open window titles: ${JSON.stringify(windowTitles)}.`));
		}, 30 * Second);
	});
};

export default waitForNextWindowMatching;

const getOpenWindowTitles = (electronApp: ElectronApplication) => {
	const windows = electronApp.windows();
	return Promise.all(windows.map(async w => {
		try {
			return await w.title();
		} catch (error) {
			return `(Error: ${error})`;
		}
	}));
};
