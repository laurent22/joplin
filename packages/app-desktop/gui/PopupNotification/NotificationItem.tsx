import * as React from 'react';
import { NotificationType } from './types';
import { _ } from '@joplin/lib/locale';

interface Props {
	children: React.ReactNode;
	key: string;
	type: NotificationType;
	dismissing: boolean;
	popup: boolean;
}

const NotificationItem: React.FC<Props> = props => {
	const [iconClassName, iconLabel] = (() => {
		if (props.type === NotificationType.Success) {
			return ['fas fa-check', _('Success')];
		}
		if (props.type === NotificationType.Error) {
			return ['fas fa-times', _('Error')];
		}
		if (props.type === NotificationType.Info) {
			return ['fas fa-info', _('Info')];
		}
		return ['', ''];
	})();

	const containerModifier = (() => {
		if (props.type === NotificationType.Success) return '-success';
		if (props.type === NotificationType.Error) return '-error';
		if (props.type === NotificationType.Info) return '-info';
		return '';
	})();

	const icon = <i
		role='img'
		aria-label={iconLabel}
		className={`icon ${iconClassName}`}
	/>;

	return <li
		role={props.popup ? 'alert' : undefined}
		className={`popup-notification-item ${containerModifier} ${props.dismissing ? '-dismissing' : ''}`}
	>
		{iconClassName ? icon : null}
		<div className='ripple'/>
		<div className='content'>
			{props.children}
		</div>
	</li>;
};

export default NotificationItem;
