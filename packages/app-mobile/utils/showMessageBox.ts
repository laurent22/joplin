import { _ } from '@joplin/lib/locale';
import { Alert, AlertButton } from 'react-native';

interface Options {
	title: string;
	buttons: string[];
}

const showMessageBox = (message: string, options: Options = null) => {
	return new Promise<number>(resolve => {
		const defaultButtons: AlertButton[] = [
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

		Alert.alert(
			options?.title ?? '',
			message,
			buttons,
		);
	});
};
export default showMessageBox;
