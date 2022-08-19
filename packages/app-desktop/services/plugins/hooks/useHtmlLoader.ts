import { useEffect, useState, useMemo } from 'react';
const md5 = require('md5');

export default function(frameWindow: any, isReady: boolean, postMessage: Function, html: string) {
	const [loadedHtmlHash, setLoadedHtmlHash] = useState('');

	const htmlHash = useMemo(() => {
		return md5(html);
	}, [html]);

	useEffect(() => {
		if (!frameWindow) return () => {};

		function onMessage(event: any) {
			const data = event.data;

			if (!data || data.target !== 'UserWebview') return;

			console.info('useHtmlLoader: message', data);

			// We only update if the HTML that was loaded is the same as
			// the active one. Otherwise it means the content has been
			// changed between the moment it was set by the user and the
			// moment it was loaded in the view.
			if (data.message === 'htmlIsSet' && data.hash === htmlHash) {
				setLoadedHtmlHash(data.hash);
			}
		}

		frameWindow.addEventListener('message', onMessage);

		return () => {
			frameWindow.removeEventListener('message', onMessage);
		};
	}, [frameWindow, htmlHash]);

	useEffect(() => {
		console.info('useHtmlLoader: isReady', isReady);

		if (!isReady) return;

		console.info('useHtmlLoader: setHtml', htmlHash);

		postMessage('setHtml', {
			hash: htmlHash,
			html: html,
		});
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [html, htmlHash, isReady]);

	return loadedHtmlHash;
}
