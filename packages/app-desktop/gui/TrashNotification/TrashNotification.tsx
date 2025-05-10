import * as React from 'react';
import { useContext, useEffect, useRef } from 'react';
import { StateLastDeletion } from '@joplin/lib/reducer';
import { _, _n } from '@joplin/lib/locale';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { ModelType } from '@joplin/lib/BaseModel';
import { Dispatch } from 'redux';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import { NotificationType } from '../PopupNotification/types';
import TrashNotificationMessage from './TrashNotificationMessage';

interface Props {
	lastDeletion: StateLastDeletion;
	lastDeletionNotificationTime: number;
	themeId: number;
	dispatch: Dispatch;
}

const onCancelClick = async (lastDeletion: StateLastDeletion) => {
	if (lastDeletion.folderIds.length) {
		await restoreItems(ModelType.Folder, lastDeletion.folderIds);
	}

	if (lastDeletion.noteIds.length) {
		await restoreItems(ModelType.Note, lastDeletion.noteIds);
	}
};

export default (props: Props) => {
	const popupManager = useContext(PopupNotificationContext);

	const lastDeletionNotificationTimeRef = useRef<number>();
	lastDeletionNotificationTimeRef.current = props.lastDeletionNotificationTime;

	useEffect(() => {
		const lastDeletionNotificationTime = lastDeletionNotificationTimeRef.current;
		if (!props.lastDeletion || props.lastDeletion.timestamp <= lastDeletionNotificationTime) return;

		props.dispatch({ type: 'DELETION_NOTIFICATION_DONE' });

		let msg = '';
		if (props.lastDeletion.folderIds.length) {
			msg = _('The notebook and its content was successfully moved to the trash.');
		} else if (props.lastDeletion.noteIds.length) {
			msg = _n('The note was successfully moved to the trash.', 'The notes were successfully moved to the trash.', props.lastDeletion.noteIds.length);
		} else {
			return;
		}

		const handleCancelClick = () => {
			notification.remove();
			void onCancelClick(props.lastDeletion);
		};
		const notification = popupManager.createPopup(() => (
			<TrashNotificationMessage message={msg} onCancel={handleCancelClick}/>
		), { type: NotificationType.Success });
		notification.scheduleDismiss();
	}, [props.lastDeletion, props.dispatch, popupManager]);

	return <div style={{ display: 'none' }}/>;
};
