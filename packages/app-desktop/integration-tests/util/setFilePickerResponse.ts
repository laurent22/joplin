import { ElectronApplication } from '@playwright/test';

const setFilePickerResponse = (electronApp: ElectronApplication, response: string[]) => {
	return electronApp.evaluate(async ({ dialog }, response) => {
		dialog.showOpenDialog = async () => ({
			canceled: false,
			filePaths: response,
		});
		dialog.showOpenDialogSync = () => response;
	}, response);
};

export default setFilePickerResponse;
