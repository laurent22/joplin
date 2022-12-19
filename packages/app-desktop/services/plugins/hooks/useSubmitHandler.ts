import { useEffect } from 'react';

export default function(frameWindow: any, onSubmit: Function, onDismiss: Function, loadedHtmlHash: string) {
	useEffect(() => {
		if (!frameWindow) return () => {};

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
				if (frameWindow.document.activeElement.tagName !== 'TEXTAREA') {
					if (onSubmit) onSubmit();
				}
			}
		}

		frameWindow.document.addEventListener('submit', onFormSubmit);
		frameWindow.document.addEventListener('keydown', onKeyDown);

		return () => {
			if (frameWindow) frameWindow.document.removeEventListener('submit', onFormSubmit);
			if (frameWindow) frameWindow.document.removeEventListener('keydown', onKeyDown);
		};
	}, [frameWindow, loadedHtmlHash, onSubmit, onDismiss]);
}
