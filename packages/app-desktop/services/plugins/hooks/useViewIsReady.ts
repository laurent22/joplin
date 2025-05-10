import { RefObject, useEffect, useState } from 'react';
import useMessageHandler from './useMessageHandler';

export default function useViewIsReady(viewRef: RefObject<HTMLIFrameElement>) {
	// Just checking if the iframe is ready is not sufficient because its content
	// might not be ready (for example, IPC listeners might not be initialised).
	// So we also listen to a custom "ready" message coming from the webview content
	// (in UserWebviewIndex.js)
	const [iframeReady, setIFrameReady] = useState(false);
	const [iframeContentReady, setIFrameContentReady] = useState(false);

	useMessageHandler(viewRef, event => {
		const data = event.data;
		if (!data || data.target !== 'UserWebview') return;

		// eslint-disable-next-line no-console
		console.debug('useViewIsReady: message', data);

		if (data.message === 'ready') {
			setIFrameContentReady(true);
		}
	});

	useEffect(() => {
		// eslint-disable-next-line no-console
		console.debug('useViewIsReady ============== Setup Listeners');

		function onIFrameReady() {
			// eslint-disable-next-line no-console
			console.debug('useViewIsReady: onIFrameReady');
			setIFrameReady(true);
		}

		const iframeDocument = viewRef.current.contentWindow.document;

		// eslint-disable-next-line no-console
		console.debug('useViewIsReady readyState', iframeDocument.readyState);

		if (iframeDocument.readyState === 'complete') {
			onIFrameReady();
		}

		const view = viewRef.current;
		view.addEventListener('dom-ready', onIFrameReady);
		view.addEventListener('load', onIFrameReady);

		return () => {
			view.removeEventListener('dom-ready', onIFrameReady);
			view.removeEventListener('load', onIFrameReady);
		};
	}, [viewRef]);

	return iframeReady && iframeContentReady;
}
