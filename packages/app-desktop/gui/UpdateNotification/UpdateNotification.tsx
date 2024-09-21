import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import NotyfContext from '../NotyfContext';
import { UpdateInfo } from 'electron-updater';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { AutoUpdaterEvents } from '../../services/autoUpdater/AutoUpdaterService';
import { NotyfEvent, NotyfNotification } from 'notyf';
import { _ } from '@joplin/lib/locale';
import { htmlentities } from '@joplin/utils/html';
import shim from '@joplin/lib/shim';

interface UpdateNotificationProps {
	themeId: number;
}

export enum UpdateNotificationEvents {
	ApplyUpdate = 'apply-update',
	UpdateNotAvailable = 'update-not-available',
	Dismiss = 'dismiss-update-notification',
}

const changelogLink = 'https://github.com/laurent22/joplin/releases';

window.openChangelogLink = () => {
	shim.openUrl(changelogLink);
};

const UpdateNotification = ({ themeId }: UpdateNotificationProps) => {
	const notyfContext = useContext(NotyfContext);
	const notificationRef = useRef<NotyfNotification | null>(null); // Use ref to hold the current notification

	const theme = useMemo(() => themeStyle(themeId), [themeId]);

	const notyf = useMemo(() => {
		const output = notyfContext;
		output.options.types = notyfContext.options.types.map(type => {
			if (type.type === 'success') {
				type.background = theme.backgroundColor5;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(type.icon as any).color = theme.backgroundColor5;
			}
			return type;
		});
		return output;
	}, [notyfContext, theme]);

	const handleDismissNotification = useCallback(() => {
		notyf.dismiss(notificationRef.current);
		notificationRef.current = null;
	}, [notyf]);

	const handleApplyUpdate = useCallback(() => {
		ipcRenderer.send('apply-update-now');
		handleDismissNotification();
	}, [handleDismissNotification]);


	const handleUpdateDownloaded = useCallback((_event: IpcRendererEvent, info: UpdateInfo) => {
		if (notificationRef.current) return;

		const updateAvailableHtml = htmlentities(_('A new update (%s) is available', info.version));
		const seeChangelogHtml = htmlentities(_('See changelog'));
		const restartNowHtml = htmlentities(_('Restart now'));
		const updateLaterHtml = htmlentities(_('Update later'));

		const messageHtml = `
		<div class="update-notification" style="color: ${theme.color2};">
			${updateAvailableHtml}  <a href="#" onclick="openChangelogLink()" style="color: ${theme.color2};">${seeChangelogHtml}</a>
			<div style="display: flex; gap: 10px; margin-top: 8px;">
				<button onclick="document.dispatchEvent(new CustomEvent('${UpdateNotificationEvents.ApplyUpdate}'))" class="notyf__button notyf__button--confirm" style="color: ${theme.color2};">${restartNowHtml}</button>
				<button onclick="document.dispatchEvent(new CustomEvent('${UpdateNotificationEvents.Dismiss}'))" class="notyf__button notyf__button--dismiss" style="color: ${theme.color2};">${updateLaterHtml}</button>
			</div>
		</div>
		`;

		const notification: NotyfNotification = notyf.open({
			type: 'success',
			message: messageHtml,
			position: {
				x: 'right',
				y: 'bottom',
			},
			duration: 0,
		});

		notificationRef.current = notification;
	}, [notyf, theme]);

	const handleUpdateNotAvailable = useCallback(() => {
		if (notificationRef.current) return;

		const noUpdateMessageHtml = htmlentities(_('No updates available'));

		const messageHtml = `
			<div class="update-notification" style="color: ${theme.color2};">
				${noUpdateMessageHtml}
			</div>
		`;

		const notification: NotyfNotification = notyf.open({
			type: 'success',
			message: messageHtml,
			position: {
				x: 'right',
				y: 'bottom',
			},
			duration: 5000,
		});

		notification.on(NotyfEvent.Dismiss, () => {
			notificationRef.current = null;
		});

		notificationRef.current = notification;
	}, [notyf, theme]);

	useEffect(() => {
		ipcRenderer.on(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
		ipcRenderer.on(AutoUpdaterEvents.UpdateNotAvailable, handleUpdateNotAvailable);
		document.addEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
		document.addEventListener(UpdateNotificationEvents.Dismiss, handleDismissNotification);

		return () => {
			ipcRenderer.removeListener(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
			ipcRenderer.removeListener(AutoUpdaterEvents.UpdateNotAvailable, handleUpdateNotAvailable);
			document.removeEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
		};
	}, [handleApplyUpdate, handleDismissNotification, handleUpdateDownloaded, handleUpdateNotAvailable]);


	return (
		<div style={{ display: 'none' }}/>
	);
};

export default UpdateNotification;
