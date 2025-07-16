import * as React from 'react';
import { useContext, useEffect } from 'react';
import { _n } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { NotificationType } from '../PopupNotification/types';

interface Props {
	noteIds: string[];
	dispatch: Dispatch;
}

export default (props: Props) => {
	const popupManager = useContext(PopupNotificationContext);

	useEffect(() => {
		if (props.noteIds.length === 0) return;

		props.dispatch({ type: 'ITEMS_CONVERTED', value: [] });

		const notification = popupManager.createPopup(() => (
			<div className='update-notification'>
				{_n(
					'The selected note was converted to Markdown and the original was sent to the Trash',
					'The selected notes were converted to Markdown and the originals were sent to the Trash',
					props.noteIds.length,
				)}
			</div>
		), { type: NotificationType.Success });
		notification.scheduleDismiss();
	}, [props.dispatch, popupManager, props.noteIds]);

	return <div style={{ display: 'none' }}/>;
};
