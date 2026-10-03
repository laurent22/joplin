import type { reg } from '@joplin/lib/registry';
import { Page } from '@playwright/test';

interface ExtendedWindow extends Window {
	joplin: {
		reg: typeof reg;
	};
}

declare const window: ExtendedWindow;

const scheduleSync = (mainWindow: Page) => {
	return mainWindow.evaluate(() => {
		return window.joplin.reg.scheduleSync(0);
	});
};

export default scheduleSync;
