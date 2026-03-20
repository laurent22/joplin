import * as React from 'react';
import { useCallback, useContext, useEffect } from 'react';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import { AutoUpdaterEvents, UpdateDownloadedInfo } from '../../services/autoUpdater/AutoUpdaterService';
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

const handleApplyUpdate = () => {
	ipcRenderer.send('apply-update-now');
};

// Converts basic Markdown release notes to simple HTML for display.
// Handles headers, bold, list items, and horizontal rules.
const releaseNotesToHtml = (notes: string): string => {
	if (!notes) return '';

	const lines = notes.split('\n');
	const htmlLines: string[] = [];

	for (const line of lines) {
		let trimmed = line.trim();
		if (!trimmed) continue;

		// Skip horizontal rules
		if (/^(\*\s*\*\s*\*|---+|___+)\s*$/.test(trimmed)) {
			htmlLines.push('<hr/>');
			continue;
		}

		// Headers
		const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
		if (headerMatch) {
			const level = headerMatch[1].length;
			const text = escapeHtml(headerMatch[2]);
			htmlLines.push(`<h${level}>${text}</h${level}>`);
			continue;
		}

		// List items
		if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
			trimmed = trimmed.substring(2);
			htmlLines.push(`<li>${formatInlineMarkdown(trimmed)}</li>`);
			continue;
		}

		htmlLines.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
	}

	return htmlLines.join('\n');
};

const escapeHtml = (text: string): string => {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
};

const formatInlineMarkdown = (text: string): string => {
	let escaped = escapeHtml(text);
	// Bold
	escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// Inline code
	escaped = escaped.replace(/`(.+?)`/g, '<code>$1</code>');
	// Links: [text](url)
	escaped = escaped.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
	return escaped;
};

const UpdateNotification: React.FC<Props> = () => {
	const popupManager = useContext(PopupNotificationContext);

	const handleUpdateDownloaded = useCallback((_event: IpcRendererEvent, info: UpdateDownloadedInfo) => {
		const openReleasePage = () => {
			if (info.pageUrl) {
				shim.openUrl(info.pageUrl);
			}
		};

		const releaseNotesHtml = releaseNotesToHtml(info.releaseNotes);

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
				{releaseNotesHtml && (
					<div
						className='update-notification-release-notes'
						dangerouslySetInnerHTML={{ __html: releaseNotesHtml }}
					/>
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
