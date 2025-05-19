import { ElectronApplication } from '@playwright/test';

const getMainWindow = async (electronApp: ElectronApplication) => {
	return await electronApp.firstWindow();
};

export default getMainWindow;
