import { useEffect, useState } from 'react';

export default function useViewIsReady(viewRef:any) {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		function onReady() {
			setIsReady(true);
		}

		const iframeDocument = viewRef.current.contentWindow.document;

		if (iframeDocument.readyState === 'complete') {
			onReady();
		}

		viewRef.current.addEventListener('dom-ready', onReady);
		viewRef.current.addEventListener('load', onReady);

		return () => {
			viewRef.current.removeEventListener('dom-ready', onReady);
			viewRef.current.removeEventListener('load', onReady);
		};
	}, []);

	return isReady;
}
