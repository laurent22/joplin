import * as React from 'react';
import { VisibleNotificationsContext } from './PopupNotificationProvider';
import NotificationItem from './NotificationItem';
import { useContext } from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {}

// This component displays the popups managed by PopupNotificationContext.
// This allows popups to be shown in multiple windows at the same time.
const PopupNotificationList: React.FC<Props> = () => {
	const popupSpecs = useContext(VisibleNotificationsContext);
	const popups = [];
	for (const spec of popupSpecs) {
		if (spec.dismissed) continue;

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
