
import type { ElectronApplication } from '@playwright/test';
import { BrowserWindow, MessageBoxOptions } from 'electron';

const respondToMessageBoxesMatching = (
	electronApp: ElectronApplication,

	// Only matches messages that match
	messagePattern: RegExp,

	// Chooses the answer that matches this pattern
	answerPattern: RegExp,
) => {
	return electronApp.evaluate(({ BrowserWindow, dialog }, [messagePattern, answerPattern]) => {
		// Mock both showMessageBox and showMessageBoxSync. The app should be able to switch between
		// the two without affecting the tests.
		const mockDialogMethod = (methodName: 'showMessageBox'|'showMessageBoxSync') => {
			const originalShowMessageBox = dialog[methodName];

			dialog[methodName] = (
				optionsArgOrWindow: BrowserWindow|MessageBoxOptions, optionsArg?: MessageBoxOptions,
			) => {
				let options: MessageBoxOptions;
				if (optionsArgOrWindow instanceof BrowserWindow) {
					options = optionsArg!;
				} else {
					options = optionsArgOrWindow;
				}

				if (options.message.match(messagePattern)) {
					const buttons = options.buttons ?? ['OK'];
					let returnIndex = -1;
					for (let i = 0; i < buttons.length; i++) {
						if (buttons[i].match(answerPattern)) {
							returnIndex = i;
							break;
						}
					}

					if (returnIndex === -1) {
						throw new Error(`Unable to find button matching ${answerPattern}`);
					}

					const result: any = {
						response: returnIndex,
						checkboxChecked: false,
					};

					if (methodName.endsWith('Sync')) {
						return result;
					} else {
						return new Promise(resolve => { resolve(result); });
					}
				} else {
					// We're forwarding the result of the original, so there's no need to conditionally
					// wrap in a promise.
					return originalShowMessageBox(optionsArgOrWindow as any, optionsArg);
				}
			};
		};
		mockDialogMethod('showMessageBox');
		mockDialogMethod('showMessageBoxSync');
	}, [messagePattern, answerPattern]);
};
export default respondToMessageBoxesMatching;
