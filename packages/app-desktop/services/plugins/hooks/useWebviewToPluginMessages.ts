import { useEffect } from 'react';

export default function(frameWindow: any, onMessage: Function, pluginId: string, viewId: string) {
	useEffect(() => {
		if (!frameWindow) return () => {};

		function onMessage(event: any) {
			if (!event.data || event.data.target !== 'plugin') return;
			onMessage({
				pluginId: pluginId,
				viewId: viewId,
				message: event.data.message,
			});
		}

		frameWindow.addEventListener('message', onMessage);

		return () => {
			frameWindow.removeEventListener('message', onMessage);
		};
	}, [onMessage, pluginId, viewId]);
}
