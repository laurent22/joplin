import { _ } from '@joplin/lib/locale';
import { Alert } from 'react-native';
import { DialogControl, PromptButton } from '../components/DialogManager';
import { RefObject } from 'react';

interface Options {
	title: string;
	buttons: string[];
}

const makeShowMessageBox = (dialogControl: null|RefObject<DialogControl>) => (message: string, options: Options = null) => {
	return new Promise<number>(resolve => {
		const defaultButtons: PromptButton[] = [
			{
				text: _('OK'),
				onPress: () => resolve(0),
			},
			{
				text: _('Cancel'),
				onPress: () => resolve(1),
				style: 'cancel',
			},
		];

		let buttons = defaultButtons;
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
