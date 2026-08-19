import { MessageBoxType } from '@joplin/lib/shim';
import { DialogControl } from '../components/DialogManager';
import { PromptButtonSpec } from '../components/DialogManager/types';
import makeShowMessageBox from './makeShowMessageBox';

type OnPrompt = (buttons: PromptButtonSpec[], onDismiss: ()=> void)=> void;
const makeMockDialogControl = (onPrompt: OnPrompt): DialogControl => {
	return {
		info: jest.fn(),
		error: jest.fn(),
		prompt: jest.fn((_title, _message, buttons, options) => {
			onPrompt(buttons, options.onDismiss);
		}),
		promptForText: jest.fn(),
		showMenu: jest.fn(),
	};
};

describe('makeShowMessageBox', () => {
	test('should resolve with the index of the selected button', async () => {
		const dialogControl = makeMockDialogControl(buttons => {
			buttons.find(button => button.text === 'OK').onPress();
		});
		const showMessageBox = makeShowMessageBox({ current: dialogControl });

		const okButtonIndex = 0;
		expect(await showMessageBox('test')).toBe(okButtonIndex);
	});

	test('should resolve to the index of the cancel button when cancelled', async () => {
		const dialogControl = makeMockDialogControl((_buttons, onDismiss) => {
			// Cancel
			onDismiss();
		});

		const showMessageBox = makeShowMessageBox({ current: dialogControl });
		expect(await showMessageBox('test')).toBe(1); // Cancel button index
		// Should resolve to -1 when there is no cancel button
		expect(await showMessageBox('test', { type: MessageBoxType.Error })).toBe(-1);
	});
});
