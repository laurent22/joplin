
import type { ElectronApplication } from '@playwright/test';
import { BrowserWindow, MessageBoxOptions } from 'electron';

// API inspired by https://github.com/spaceagetv/electron-playwright-helpers/
const mockNextShowMessageCall = (
	electronApp: ElectronApplication,
	messagePattern: RegExp,
	answerPattern: RegExp,
) => {
	return electronApp.evaluate(({ BrowserWindow, dialog }, [messagePattern, answerPattern]) => {
		let originalShowMessageBox = dialog.showMessageBox;

		const showMessageBox = async (
			optionsArgOrWindow: BrowserWindow|MessageBoxOptions, optionsArg?: MessageBoxOptions
		): Promise<Electron.MessageBoxReturnValue> => {
			let options: MessageBoxOptions;
			if (optionsArgOrWindow instanceof BrowserWindow) {
				options = optionsArg!;
			} else {
				options = optionsArgOrWindow;
			}

			if (options.message.match(messagePattern)) {
				dialog.showMessageBox = originalShowMessageBox;

				const buttons = options.buttons ?? [ 'OK' ];
				let returnIndex = -1;
				for (let i = 0; i < buttons.length; i++) {
					if (buttons[i].match(answerPattern)) {
						returnIndex = i;
						break;
					}
				}
				console.log('!!! matched0!');

				if (returnIndex === -1) {
					throw new Error(`Unable to find button matching ${answerPattern}`);
				}
				console.log('!!! matched!');

				return {
					response: returnIndex,
					checkboxChecked: false,
				};
			} else {
				const previousToplevelShowMessageBox = dialog.showMessageBox;

				let result;
				try {
					result = await originalShowMessageBox(optionsArgOrWindow as any, optionsArg);
				} finally {
					// Handle the case where result is a version of this function
					// and it attempted to restore dialog.showMessageBox to the
					// function it originally overrode.
					if (previousToplevelShowMessageBox !== dialog.showMessageBox) {
						console.log('!!! replaced!');
						const temp = dialog.showMessageBox;
						dialog.showMessageBox = previousToplevelShowMessageBox;
						originalShowMessageBox = temp;
					}
				}

				return result;
			}
		};
		dialog.showMessageBox = showMessageBox;
	}, [messagePattern, answerPattern]);
};
export default mockNextShowMessageCall;

