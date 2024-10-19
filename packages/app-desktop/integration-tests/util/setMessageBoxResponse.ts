import { ElectronApplication } from '@playwright/test';
import { BaseWindow, MessageBoxOptions } from 'electron';

const setMessageBoxResponse = (electronApp: ElectronApplication, responseMatch: RegExp) => {
	return electronApp.evaluate(async ({ dialog }, responseMatch) => {
		type DialogArgsType = [ BaseWindow, MessageBoxOptions ]|[MessageBoxOptions];

		const getMatchingButton = (dialogArgs: DialogArgsType) => {
			const matchingButton = (options: MessageBoxOptions) => {
				const buttons = options.buttons ?? ['OK'];

				for (let i = 0; i < buttons.length; i++) {
					if (buttons[i].match(responseMatch)) {
						return i;
					}
				}

				throw new Error('No matching button found');
			};

			if (dialogArgs.length === 1) {
				return matchingButton(dialogArgs[0]);
			} else {
				return matchingButton(dialogArgs[1]);
			}
		};
		dialog.showMessageBoxSync = (...args: DialogArgsType) => getMatchingButton(args);
		dialog.showMessageBox = async (...args: DialogArgsType) => ({
			response: getMatchingButton(args),
			checkboxChecked: false,
		// We're mocking, so include "as any" to prevent this from breaking when we upgrade
		// Electron.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		} as any);
	}, responseMatch);
};

export default setMessageBoxResponse;
