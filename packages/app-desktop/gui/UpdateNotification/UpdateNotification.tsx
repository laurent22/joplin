import * as React from 'react';
import { useCallback, useContext, useEffect } from 'react';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { AutoUpdaterEvents, UpdateDownloadedInfo } from '../../services/autoUpdater/AutoUpdaterService';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import { PopupNotificationContext } from '../PopupNotification/PopupNotificationProvider';
import Button, { ButtonLevel } from '../Button/Button';
import { NotificationType } from '../PopupNotification/types';
import { ReleaseNotesContent } from './releaseNotesParser';

interface Props {
}

export enum UpdateNotificationEvents {
	ApplyUpdate = 'apply-update',
	UpdateNotAvailable = 'update-not-available',
	Dismiss = 'dismiss-update-notification',
}

const handleApplyUpdate = () => {
	ipcRenderer.send('apply-update-now');
};

const UpdateNotification: React.FC<Props> = () => {
	const popupManager = useContext(PopupNotificationContext);

	const handleUpdateDownloaded = useCallback((_event: IpcRendererEvent, info: UpdateDownloadedInfo) => {
		const openReleasePage = () => {
			if (info.pageUrl) {
				shim.openUrl(info.pageUrl);
			}
		};

		const notification = popupManager.createPopup(() => (
			<div className='update-notification'>
				<div className='update-notification-header'>
					<span className='update-notification-title'>
						{_('A new update (%s) is available', info.version)}
					</span>
					{info.pageUrl && (
						<button className='link-button' onClick={openReleasePage}>
							{_('Full release notes')}
						</button>
					)}
				</div>
				{info.releaseNotes && (
					<div
						className='update-notification-release-notes'
						tabIndex={0}
						role='region'
						aria-label={_('Release notes')}
					>
						<ReleaseNotesContent markdown={info.releaseNotes} />
					</div>
				)}
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
