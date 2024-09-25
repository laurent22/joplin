import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import NotyfContext from '../NotyfContext';
import { UpdateInfo } from 'electron-updater';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { AutoUpdaterEvents, UpdateNotificationMessage } from '../../services/autoUpdater/AutoUpdaterService';
import { NotyfNotification } from 'notyf';
import { _ } from '@joplin/lib/locale';
import { htmlentities } from '@joplin/utils/html';
import shim from '@joplin/lib/shim';

interface UpdateNotificationProps {
	themeId: number;
}

export enum UpdateNotificationEvents {
	ApplyUpdate = 'apply-update',
	Dismiss = 'dismiss-update-notification',
}

const changelogLink = 'https://github.com/laurent22/joplin/releases';
const notificationDuration = 5000; // 5 seconds

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

	const handleNotificationMessage = useCallback((_event: IpcRendererEvent, args: UpdateNotificationMessage) => {
		if (notificationRef.current) return;

		const noUpdateMessageHtml = htmlentities(_('%s', args.message));

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
			duration: notificationDuration,
		});
		notificationRef.current = notification;

		setTimeout(() => {
			if (notificationRef.current === notification) {
				notificationRef.current = null;
			}
		}, notificationDuration);
	}, [notyf, theme]);

	useEffect(() => {
		ipcRenderer.on(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
		ipcRenderer.on(AutoUpdaterEvents.NotificationMessage, handleNotificationMessage);
		document.addEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
		document.addEventListener(UpdateNotificationEvents.Dismiss, handleDismissNotification);

		return () => {
			ipcRenderer.removeListener(AutoUpdaterEvents.UpdateDownloaded, handleUpdateDownloaded);
			ipcRenderer.removeListener(AutoUpdaterEvents.NotificationMessage, handleNotificationMessage);
			document.removeEventListener(UpdateNotificationEvents.ApplyUpdate, handleApplyUpdate);
		};
	}, [handleApplyUpdate, handleDismissNotification, handleUpdateDownloaded, handleNotificationMessage]);


	return (
		<div style={{ display: 'none' }}/>
	);
};

export default UpdateNotification;
