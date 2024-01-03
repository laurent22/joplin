import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import { PluginApi, PluginWebViewApi } from '../types';
import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';

export const runPlugin = (
	pluginBackgroundScript: string, pluginScript: string, messageChannelId: string,
) => {
	const backgroundIframe = document.createElement('iframe');
	backgroundIframe.srcdoc = `
		<!DOCTYPE html>
		<html>
		<head></head>
		<body>
			<script>
				window.onmessage = (event) => {
					if (event.origin !== parent) return;
					if (event.data.kind !== 'add-script') return;

					window.onmessage = undefined;
					const scriptElem = document.createElement('script');
					scriptElem.innerText = event.data.script;
					document.head.appendChild(scriptElem);
				}
			</script>
		</body>
		</html>
	`;
	backgroundIframe.contentWindow.addEventListener('load', () => {
		backgroundIframe.contentWindow.postMessage({
			kind: 'add-script',
			script: `"use strict";
				${pluginBackgroundScript}

				window.joplin = pluginBackgroundPageBundle.createPluginApiProxy(${JSON.stringify(messageChannelId)});
				${pluginScript}
			`,
		});

		// Chain connectionToParent with connectionToIframe
		const connectionToParent = new WebViewToRNMessenger<PluginWebViewApi, PluginApi>(messageChannelId, null);
		const connectionToIframe = new WindowMessenger<PluginWebViewApi, PluginApi>(
			messageChannelId, backgroundIframe.contentWindow, connectionToParent.remoteApi,
		);
		connectionToParent.setLocalInterface(connectionToIframe.remoteApi);
	}, { once: true });
};

export const createPluginApiProxy = (messageChannelId: string) => {
	const localApi = { };
	const messenger = new WindowMessenger<PluginWebViewApi, PluginApi>(messageChannelId, parent, localApi);
	return messenger.remoteApi.api;
};
