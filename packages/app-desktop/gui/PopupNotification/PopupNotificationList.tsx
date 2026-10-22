import * as React from 'react';
import { VisibleNotificationsContext } from './PopupNotificationProvider';
import NotificationItem from './NotificationItem';
import { useContext } from 'react';
import { _ } from '@joplin/lib/locale';
import { WindowIdContext } from '../NewWindowOrIFrame';

interface Props {}

// This component displays the popups managed by PopupNotificationContext.
const PopupNotificationList: React.FC<Props> = () => {
	const popupSpecs = useContext(VisibleNotificationsContext);
	const windowId = useContext(WindowIdContext);
	const popups = [];
	for (const spec of popupSpecs) {
		if (spec.dismissed || spec.windowId !== windowId) continue;

		popups.push(
			<NotificationItem
				key={spec.key}
				type={spec.type}
				dismissing={!!spec.dismissAt}
				popup={true}
			>{spec.content()}</NotificationItem>,
		);
	}
	popups.reverse();

	if (popups.length) {
		return <ul
			className='popup-notification-list -overlay'
			role='group'
			aria-label={_('Notifications')}
		>
			{popups}
		</ul>;
	} else {
		return null;
	}
};

export default PopupNotificationList;
