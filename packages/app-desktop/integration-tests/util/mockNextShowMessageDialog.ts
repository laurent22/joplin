
import type { ElectronApplication } from '@playwright/test';
import { BrowserWindow, MessageBoxOptions } from 'electron';

// API inspired by https://github.com/spaceagetv/electron-playwright-helpers/
const mockNextShowMessageCall = (
	electronApp: ElectronApplication,
	messagePattern: RegExp,
	answerPattern: RegExp,
) => {
	return electronApp.evaluate(({ BrowserWindow, dialog }, [messagePattern, answerPattern]) => {
		const mockDialogMethod = (methodName: 'showMessageBox'|'showMessageBoxSync') => {
			let originalShowMessageBox = dialog[methodName];

			dialog[methodName] = (
				optionsArgOrWindow: BrowserWindow|MessageBoxOptions, optionsArg?: MessageBoxOptions,
			) => {
				let options: MessageBoxOptions;
				if (optionsArgOrWindow instanceof BrowserWindow) {
					options = optionsArg!;
				} else {
					options = optionsArgOrWindow;
				}

				let result: any;

				if (options.message.match(messagePattern)) {
					dialog[methodName] = originalShowMessageBox as any;

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

					result = {
						response: returnIndex,
						checkboxChecked: false,
					};
				} else {
					const previousToplevelShowMessageBox = dialog[methodName];

					try {
						result = originalShowMessageBox(optionsArgOrWindow as any, optionsArg);
					} finally {
						// Handle the case where result is a version of this function
						// and it attempted to restore dialog.showMessageBox to the
						// function it originally overrode.
						if (previousToplevelShowMessageBox !== dialog.showMessageBox) {
							const temp = dialog[methodName];
							dialog[methodName] = previousToplevelShowMessageBox as any;
							originalShowMessageBox = temp as any;
						}
					}

					// We're forwarding the result of the original, so there's no need to
					// wrap in a promise.
					return result;
				}

				if (methodName.endsWith('Sync')) {
					return result;
				} else {
					return new Promise(resolve => { resolve(result as any); });
				}
			};
		};
		mockDialogMethod('showMessageBox');
		mockDialogMethod('showMessageBoxSync');
	}, [messagePattern, answerPattern]);
};
export default mockNextShowMessageCall;

