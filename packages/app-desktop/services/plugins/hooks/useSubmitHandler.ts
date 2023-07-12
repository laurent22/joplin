import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function(frameWindow: any, onSubmit: Function, onDismiss: Function, loadedHtmlHash: string) {
	const document = frameWindow && frameWindow.document ? frameWindow.document : null;

	useEffect(() => {
		if (!document) return () => {};

		function onFormSubmit(event: any) {
			event.preventDefault();
			if (onSubmit) onSubmit();
		}

		function onKeyDown(event: any) {
			if (event.key === 'Escape') {
				if (onDismiss) onDismiss();
			}

			if (event.key === 'Enter') {
				//
				// Disable enter key from submitting when a text area is in focus!
				// https://github.com/laurent22/joplin/issues/4766
				//
				if (document.activeElement.tagName !== 'TEXTAREA') {
					if (onSubmit) onSubmit();
				}
			}
		}

		document.addEventListener('submit', onFormSubmit);
		document.addEventListener('keydown', onKeyDown);

		return () => {
			if (document) document.removeEventListener('submit', onFormSubmit);
			if (document) document.removeEventListener('keydown', onKeyDown);
		};
	}, [document, loadedHtmlHash, onSubmit, onDismiss]);
}
