import * as React from 'react';
import { useContext, useCallback } from 'react';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { ToastOptions, NotificationType } from '../PopupNotification/types';
import type { PopupHandle } from '../PopupNotification/types';

export default function useToast() {
	const popupManager = useContext(PopupNotificationContext);

	return useCallback(
		(message: React.ReactNode | string, options: ToastOptions = {}) => {
			const {
				type = NotificationType.Info,
				delay = 4000,
				persistent = false,
			} = options;

			const handle: PopupHandle = popupManager.createPopup(() => message, { type });

			if (!persistent) {
				try {
					handle.scheduleDismiss?.(delay);
				} catch {
					handle.scheduleDismiss?.();
				}
			}

			return handle;
		},
		[popupManager],
	);
}
