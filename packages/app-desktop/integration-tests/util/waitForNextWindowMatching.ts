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
		};

		const onWindowAdded = async (page: Page) => {
			if ((await page.title()).match(titlePattern)) {
				clearListenersAndTimeouts();
				resolve(page);
			}
		};
		electronApp.on('window', onWindowAdded);

		timeout = setTimeout(async () => {
			timeout = null;
			clearListenersAndTimeouts();

			const windows = electronApp.windows();
			const titles = await Promise.all(windows.map(w => w.title()));
			reject(new Error(`Opening a window timed out. Open window titles: ${JSON.stringify(titles)}.`));
		}, 30 * Second);
	});
};

export default waitForNextWindowMatching;
