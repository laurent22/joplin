import { _ } from '@joplin/lib/locale';
import { Alert } from 'react-native';
import { DialogControl } from '../components/DialogManager';
import { RefObject } from 'react';
import { MessageBoxType, ShowMessageBoxOptions } from '@joplin/lib/shim';
import { PromptButtonSpec } from '../components/DialogManager/types';


const makeShowMessageBox = (dialogControl: null|RefObject<DialogControl>) => (message: string, options: ShowMessageBoxOptions = {}) => {
	return new Promise<number>(resolve => {
		const okButton: PromptButtonSpec = {
			text: _('OK'),
			onPress: () => resolve(0),
		};
		const cancelButton: PromptButtonSpec = {
			text: _('Cancel'),
			onPress: () => resolve(1),
			style: 'cancel',
		};
		const defaultConfirmButtons = [cancelButton, okButton];
		const defaultAlertButtons = [okButton];

		const dialogType = options.type ?? MessageBoxType.Confirm;
		let buttons = dialogType === MessageBoxType.Confirm ? defaultConfirmButtons : defaultAlertButtons;
		if (options?.buttons) {
			buttons = options.buttons.map((text, index) => {
				return {
					text,
					style: index === options.cancelId ? 'cancel' : 'default',
					onPress: () => resolve(index),
				};
			});
			// Android and iOS usually have the cancel button first.
			buttons = moveCancelFirst(buttons);
		}

		// This will be -1 for dialogs that don't include the default "cancel" button
		// Even though cancel is at position 0, this needs to return 1 for cancel for compatibility
		// reasons.
		const defaultCancelId = buttons.includes(cancelButton) ? 1 : -1;
		const cancelId = options.cancelId ?? defaultCancelId;

		// Web doesn't support Alert.alert -- prefer using the global dialogControl if available.
		(dialogControl?.current?.prompt ?? Alert.alert)(
			options?.title ?? '',
			message,
			buttons,
			{ onDismiss: () => resolve(cancelId) },
		);
	});
};
export default makeShowMessageBox;

const moveCancelFirst = (buttons: PromptButtonSpec[]) => {
	const result = [];

	const cancelButton = buttons.find(button => button.style === 'cancel');
	if (cancelButton) {
		result.push(cancelButton);
	}

	for (const button of buttons) {
		if (button !== cancelButton) {
			result.push(button);
		}
	}

	return result;
};
