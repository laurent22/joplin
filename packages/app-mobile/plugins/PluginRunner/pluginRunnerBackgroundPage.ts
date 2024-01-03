import WebViewToRNMessenger from '../../utils/ipc/WebViewToRNMessenger';
import { PluginApi, PluginWebViewApi } from './types';
import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';

export const pathLibrary = require('path');

export const requireModule = (moduleName: string) => {
	if (moduleName === 'path') {
		return pathLibrary;
	}

	throw new Error(`Unable to require module ${moduleName} on mobile.`);
};

export const runPlugin = (
	pluginBackgroundScript: string, pluginScript: string, messageChannelId: string,
) => {
	const backgroundIframe = document.createElement('iframe');
	backgroundIframe.addEventListener('load', () => {
		console.log('backgroundIframe loaded');

		backgroundIframe.contentWindow.postMessage({
			kind: 'add-script',
			script: `"use strict";
				${pluginBackgroundScript}

				window.require = pluginBackgroundPage.requireModule;
				window.joplin = pluginBackgroundPage.createPluginApiProxy(${JSON.stringify(messageChannelId)});
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

	backgroundIframe.srcdoc = `
		<!DOCTYPE html>
		<html>
		<head></head>
		<body>
			<script>
				window.onmessage = (event) => {
					console.log('got message', event);
					if (event.source !== parent) {
						console.log('Ignoring message: wrong source');
						return;
					}
					if (event.data.kind !== 'add-script') {
						console.log('Ignoring message: wrong type', event.data.kind);
						return;
					}

					console.log('Adding plugin script...');
					window.onmessage = undefined;
					const scriptElem = document.createElement('script');
					scriptElem.appendChild(document.createTextNode(event.data.script));
					document.head.appendChild(scriptElem);
				};
			</script>
		</body>
		</html>
	`;

	document.body.appendChild(backgroundIframe);
};

export const createPluginApiProxy = (messageChannelId: string) => {
	const localApi = { };
	const messenger = new WindowMessenger<PluginWebViewApi, PluginApi>(messageChannelId, parent, localApi);
	(window as any).messenger = messenger;
	return messenger.remoteApi.api;
};
