import * as React from 'react';
import { useEffect, useRef } from 'react';
import { StateLastDeletion } from '@joplin/lib/reducer';
import { _, _n } from '@joplin/lib/locale';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { ModelType } from '@joplin/lib/BaseModel';
import { Dispatch } from 'redux';
import { NotificationType } from '../PopupNotification/types';
import TrashNotificationMessage from './TrashNotificationMessage';
import useToastNotifier from '../../gui/hooks/useToast';

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
	const notify = useToastNotifier();

	const lastDeletionNotificationTimeRef = useRef<number>(props.lastDeletionNotificationTime);
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
		const notification = notify(
			<TrashNotificationMessage message={msg} onCancel={handleCancelClick} />,
			{
				delay: 4000,
				type: NotificationType.Success,
				persistent: false,
			},
		);
	}, [props.lastDeletion, props.dispatch, notify]);

	return <div style={{ display: 'none' }}/>;
};
