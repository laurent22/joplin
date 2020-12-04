import Logger from '@joplin/lib/Logger';
import { useEffect } from 'react';

const logger = Logger.create('useWebviewToPluginMessages');

export default function(frameWindow: any, isReady: boolean, onMessage: Function, pluginId: string, viewId: string) {
	useEffect(() => {
		if (!frameWindow) return () => {};

		function onMessage_(event: any) {
			if (!event.data || event.data.target !== 'plugin') return;

			// The message is passed from one component or service to the next
			// till it reaches its destination, so if something doesn't work
			// follow the chain of messages searching for the string "Got message"
			logger.debug('Got message (WebView => Plugin) (1)', pluginId, viewId, event.data.message);

			onMessage({
				pluginId: pluginId,
				viewId: viewId,
				message: event.data.message,
			});
		}

		frameWindow.addEventListener('message', onMessage_);

		return () => {
			frameWindow.removeEventListener('message', onMessage_);
		};
	}, [frameWindow, onMessage, isReady, pluginId, viewId]);
}
