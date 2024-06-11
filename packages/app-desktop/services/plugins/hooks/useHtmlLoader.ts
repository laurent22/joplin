import { useEffect, useState, useMemo } from 'react';
const md5 = require('md5');

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
export default function(frameWindow: any, isReady: boolean, postMessage: Function, html: string) {
	const [loadedHtmlHash, setLoadedHtmlHash] = useState('');

	const htmlHash = useMemo(() => {
		return md5(html);
	}, [html]);

	useEffect(() => {
		if (!frameWindow) return () => {};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function onMessage(event: any) {
			const data = event.data;

			if (!data || data.target !== 'UserWebview') return;

			// eslint-disable-next-line no-console
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
			if (frameWindow.removeEventListener) frameWindow.removeEventListener('message', onMessage);
		};
	}, [frameWindow, htmlHash]);

	useEffect(() => {
		// eslint-disable-next-line no-console
		console.info('useHtmlLoader: isReady', isReady);

		if (!isReady) return;

		// eslint-disable-next-line no-console
		console.info('useHtmlLoader: setHtml', htmlHash);

		postMessage('setHtml', {
			hash: htmlHash,
			html: html,
		});
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [html, htmlHash, isReady]);

	return loadedHtmlHash;
}
