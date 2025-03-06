import { _ } from '@joplin/lib/locale';
import { Alert } from 'react-native';
import { DialogControl } from '../components/DialogManager';
import { RefObject } from 'react';
import { MessageBoxType, ShowMessageBoxOptions } from '@joplin/lib/shim';
import { PromptButtonSpec } from '../components/DialogManager/types';


const makeShowMessageBox = (dialogControl: null|RefObject<DialogControl>) => (message: string, options: ShowMessageBoxOptions = null) => {
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
		const defaultConfirmButtons = [okButton, cancelButton];
		const defaultAlertButtons = [okButton];

		const dialogType = options.type ?? MessageBoxType.Confirm;
		let buttons = dialogType === MessageBoxType.Confirm ? defaultConfirmButtons : defaultAlertButtons;
		if (options?.buttons) {
			buttons = options.buttons.map((text, index) => {
				return {
					text,
					onPress: () => resolve(index),
				};
			});
		}

		// Web doesn't support Alert.alert -- prefer using the global dialogControl if available.
		(dialogControl?.current?.prompt ?? Alert.alert)(
			options?.title ?? '',
			message,
			buttons,
		);
	});
};
export default makeShowMessageBox;
