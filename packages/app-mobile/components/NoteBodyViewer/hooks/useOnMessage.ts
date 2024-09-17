import { useCallback } from 'react';
import shared from '@joplin/lib/components/shared/note-screen-shared';
import Logger from '@joplin/utils/Logger';

export type HandleMessageCallback = (message: string)=> void;
export type OnMarkForDownloadCallback = (resource: { resourceId: string })=> void;

interface MessageCallbacks {
	onMarkForDownload?: OnMarkForDownloadCallback;
	onJoplinLinkClick: HandleMessageCallback;
	onResourceLongPress: HandleMessageCallback;
	onRequestEditResource?: HandleMessageCallback;
	onCheckboxChange: HandleMessageCallback;
}

const logger = Logger.create('useOnMessage');

export default function useOnMessage(
	noteBody: string,
	callbacks: MessageCallbacks,
) {
	// Destructure callbacks. Because we have that ({ a: 1 }) !== ({ a: 1 }),
	// we can expect the `callbacks` variable from the last time useOnMessage was called to
	// not equal the current` callbacks` variable, even if the callbacks themselves are the
	// same.
	//
	// Thus, useCallback should depend on each callback individually.
	const {
		onMarkForDownload, onResourceLongPress, onCheckboxChange, onRequestEditResource, onJoplinLinkClick,
	} = callbacks;

	return useCallback((msg: string) => {
		const isScrollMessage = msg.startsWith('onscroll:');

		// Scroll messages are very frequent so we avoid logging them, even
		// in debug mode
		if (!isScrollMessage) {
			logger.debug('Got IPC message: ', msg);
		}

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, noteBody);
			onCheckboxChange?.(newBody);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const splittedMsg = msg.split(':');
			const resourceId = splittedMsg[1];
			onMarkForDownload?.({ resourceId: resourceId });
		} else if (msg.startsWith('longclick:')) {
			onResourceLongPress(msg);
		} else if (msg.startsWith('edit:')) {
			onRequestEditResource?.(msg);
		} else if (msg.startsWith('joplin:')) {
			onJoplinLinkClick(msg);
		} else if (msg.startsWith('error:')) {
			console.error(`Webview injected script error: ${msg}`);
		} else {
			onJoplinLinkClick(msg);
		}
	}, [
		noteBody,
		onCheckboxChange,
		onMarkForDownload,
		onJoplinLinkClick,
		onResourceLongPress,
		onRequestEditResource,
	]);
}
