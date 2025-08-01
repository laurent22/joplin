import * as React from 'react';
import { useContext, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { NotificationType } from '../PopupNotification/types';

interface Props {
	noteId: string;
	dispatch: Dispatch;
}

export default (props: Props) => {
	const popupManager = useContext(PopupNotificationContext);

	useEffect(() => {
		if (!props.noteId || props.noteId === '') return;

		props.dispatch({ type: 'NOTE_HTML_TO_MARKDOWN_DONE', value: '' });

		const notification = popupManager.createPopup(() => (
			<div>{_('The note has been converted to Markdown and the original note has been moved to the trash')}</div>
		), { type: NotificationType.Success });
		notification.scheduleDismiss();
	}, [props.dispatch, popupManager, props.noteId]);

	return <div style={{ display: 'none' }}/>;
};
