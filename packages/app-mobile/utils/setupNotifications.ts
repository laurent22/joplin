import { NativeEventEmitter, NativeModules, Platform } from "react-native";

export default async (dispatch: any) => {
    if (Platform.OS === 'android') {
        const { RNAlarmNotification } = NativeModules;
        const RNAlarmEmitter = new NativeEventEmitter(RNAlarmNotification);

        const handleNotification = async (notification: any) => {
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
        }

        // receive notification click events when the app is running
        RNAlarmEmitter.addListener('OnNotificationOpened', handleNotification);

        // retirive notification info if the app was started after the user clicked notification
        const notification = await RNAlarmNotification.getAlarmInfo();
        await handleNotification(notification);
    }    
}