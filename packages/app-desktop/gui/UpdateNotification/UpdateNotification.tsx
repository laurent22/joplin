import * as React from 'react';
import { useCallback, useContext, useEffect } from 'react';
import { UpdateInfo } from 'electron-updater';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { AutoUpdaterEvents } from '../../services/autoUpdater/AutoUpdaterService';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import Button, { ButtonLevel } from '../Button/Button';
import { NotificationType } from '../PopupNotification/types';

interface Props {
}

export enum UpdateNotificationEvents {
	ApplyUpdate = 'apply-update',
	UpdateNotAvailable = 'update-not-available',
	Dismiss = 'dismiss-update-notification',
}

const changelogLink = 'https://github.com/laurent22/joplin/releases';

const openChangelogLink = () => {
	shim.openUrl(changelogLink);
};

const handleApplyUpdate = () => {
	ipcRenderer.send('apply-update-now');
};

const UpdateNotification: React.FC<Props> = () => {
	const popupManager = useContext(PopupNotificationContext);

	const handleUpdateDownloaded = useCallback((_event: IpcRendererEvent, info: UpdateInfo) => {
		const notification = popupManager.createPopup(() => (
			<div className='update-notification'>
				{_('A new update (%s) is available', info.version)}
				<button className='link-button' onClick={openChangelogLink}>{
					_('See changelog')
				}</button>
				<div className='buttons'>
					<Button
						level={ButtonLevel.Tertiary}
						onClick={() => {
							notification.remove();
							handleApplyUpdate();
						}}
						title={_('Restart now')}
					/>
					<Button
						level={ButtonLevel.Tertiary}
						onClick={() => notification.remove()}
						title={_('Update later')}
					/>
				</div>
			</div>
		));
	}, [popupManager]);

	const handleUpdateNotAvailable = useCallback(() => {
		const notification = popupManager.createPopup(() => (
			<div className='update-notification'>
				{_('No updates available')}
			</div>
		), { type: NotificationType.Info });
		notification.scheduleDismiss();
	}, [popupManager]);

	useEffect(() => {
		ipcRenderer.on(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
		ipcRenderer.on(AutoUpdaterEvents.UpdateNotAvailable, handleUpdateNotAvailable);

		return () => {
			ipcRenderer.removeListener(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
			ipcRenderer.removeListener(AutoUpdaterEvents.UpdateNotAvailable, handleUpdateNotAvailable);
		};
	}, [handleUpdateDownloaded, handleUpdateNotAvailable]);


	return (
		<div style={{ display: 'none' }}/>
	);
};

export default UpdateNotification;
