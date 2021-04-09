import { useCallback } from 'react';
const shared = require('@joplin/lib/components/shared/note-screen-shared');

export default function useOnMessage(onCheckboxChange: Function, noteBody: string, onMarkForDownload: Function, onJoplinLinkClick: Function, onResourceLongPress: Function) {
	return useCallback((event: any) => {
		// Since RN 58 (or 59) messages are now escaped twice???
		let msg = unescape(unescape(event.nativeEvent.data));
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
			// msg is broken at this point if it contained special characters
			// see: https://github.com/laurent22/joplin/issues/4494

			msg = event.nativeEvent.data;
			onJoplinLinkClick(msg);
		}
	}, [onCheckboxChange, noteBody, onMarkForDownload, onJoplinLinkClick, onResourceLongPress]);
}
