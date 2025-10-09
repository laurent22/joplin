import * as React from 'react';
import { useContext, useCallback } from 'react';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { ToastOptions, NotificationType } from '../PopupNotification/types';

export default function useToastNotifier() {
	const popupManager = useContext(PopupNotificationContext);

	return useCallback(
		(message: React.ReactNode | string, options: ToastOptions = {}) => {
			const {
				type = NotificationType.Success,
				delay = 4000,
				persistent = false,
			} = options;

			const handle = popupManager.createPopup(() => message, { type });

			if (!persistent) {
				handle.scheduleDismiss(delay);
			}

			return handle;
		},
		[popupManager],
	);
}
