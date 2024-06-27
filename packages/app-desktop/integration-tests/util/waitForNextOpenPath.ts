import { ElectronApplication } from '@playwright/test';

const waitForNextOpenPath = (electronApp: ElectronApplication) => {
	return electronApp.evaluate(async ({ shell }) => {
		return new Promise<string>(resolve => {
			const originalOpenPath = shell.openPath;
			shell.openPath = async (path: string) => {
				shell.openPath = originalOpenPath;
				resolve(path);
				return '';
			};
		});
	});
};

export default waitForNextOpenPath;
