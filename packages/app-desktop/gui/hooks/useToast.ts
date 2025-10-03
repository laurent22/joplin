import * as React from 'react';
import { useContext, useCallback } from 'react';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { NotificationType } from '../PopupNotification/types';
import type { PopupHandle } from '../PopupNotification/types';

export default function useToast() {
	const popupManager = useContext(PopupNotificationContext);
	type Duration = number | 'persist';

	return useCallback(
		(
			message: React.ReactNode,
			duration: Duration = 4000,
			type: NotificationType = NotificationType.Info,
		): PopupHandle => {
			const handle = popupManager.createPopup(() => message, { type });

			if (duration !== 'persist') {
				try {
					handle.scheduleDismiss?.(duration);
				} catch {
					handle.scheduleDismiss?.();
				}
			}

			return handle;
		},
		[popupManager],
	);
}
