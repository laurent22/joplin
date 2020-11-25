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
				if (onSubmit) onSubmit();
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
