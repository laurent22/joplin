import { Dispatch } from 'redux';

const { NativeEventEmitter, NativeModules, Platform } = require('react-native');

interface NotificationData {
	joplinNotificationId: string;
	noteId: string;
}

export default async (dispatch: Dispatch) => {
	if (Platform.OS === 'android') {
		const RNAlarmNotification = NativeModules.RNAlarmNotification;
		const RNAlarmEmitter = new NativeEventEmitter(RNAlarmNotification);

		const handleNotification = async (notification: NotificationData) => {
			if (notification) {
				const noteId = notification.noteId;
				if (noteId) {
					dispatch({ type: 'NAV_BACK' });
					dispatch({ type: 'SIDE_MENU_CLOSE' });
					dispatch({
						type: 'NAV_GO',
						noteId: noteId,
						routeName: 'Note',
					});
				}
			}
		};

		// receive notification click events when the app is running
		RNAlarmEmitter.addListener('OnNotificationOpened', handleNotification);

		// retrieve notification info if the app was started after the user clicked notification
		const notification = await RNAlarmNotification.getAlarmInfo();
		await handleNotification(notification);
	}
};
