import { useCallback } from 'react';
import shared from '@joplin/lib/components/shared/note-screen-shared';

export default function useOnMessage(onCheckboxChange: Function, noteBody: string, onMarkForDownload: Function, onJoplinLinkClick: Function, onResourceLongPress: Function) {
	return useCallback((event: any) => {
		// 2021-05-19: Historically this was unescaped twice as it was
		// apparently needed after an upgrade to RN 58 (or 59). However this is
		// no longer needed and in fact would break certain URLs so it can be
		// removed. Keeping the comment here anyway in case we find some URLs
		// that end up being broken after removing the double unescaping.
		// https://github.com/laurent22/joplin/issues/4494
		const msg = event.nativeEvent.data;

		// eslint-disable-next-line no-console
		console.info('Got IPC message: ', msg);

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, noteBody);
			if (onCheckboxChange) onCheckboxChange(newBody);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const splittedMsg = msg.split(':');
			const resourceId = splittedMsg[1];
			if (onMarkForDownload) onMarkForDownload({ resourceId: resourceId });
		} else if (msg.startsWith('longclick:')) {
			onResourceLongPress(msg);
		} else if (msg.startsWith('joplin:')) {
			onJoplinLinkClick(msg);
		} else if (msg.startsWith('error:')) {
			console.error(`Webview injected script error: ${msg}`);
		} else {
			onJoplinLinkClick(msg);
		}
	}, [onCheckboxChange, noteBody, onMarkForDownload, onJoplinLinkClick, onResourceLongPress]);
}
