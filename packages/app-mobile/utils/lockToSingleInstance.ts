import { _ } from '@joplin/lib/locale';
import { Platform } from 'react-native';

const lockToSingleInstance = async () => {
	if (Platform.OS !== 'web') return;

	const channel = new BroadcastChannel('single-instance-lock');
	channel.postMessage('app-opened');

	await new Promise<void>((resolve, reject) => {
		channel.onmessage = (event) => {
			if (event.data === 'app-opened') {
				channel.postMessage('already-running');
			} else if (event.data === 'already-running') {
				alert(_('At present, Joplin Web can only be open in one tab at a time. Please close the other instance of Joplin.'));
				reject(new Error(_('Joplin is already running.')));
			}
		};
		setTimeout(() => resolve(), 250);
	});
};
export default lockToSingleInstance;
