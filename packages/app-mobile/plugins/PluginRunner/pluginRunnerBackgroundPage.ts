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

const pluginIdToIframe: Record<string, HTMLIFrameElement> = Object.create(null);

export const runPlugin = (
	pluginBackgroundScript: string, pluginScript: string, messageChannelId: string, pluginId: string,
) => {
	const backgroundIframe = document.createElement('iframe');
	pluginIdToIframe[pluginId] = backgroundIframe;
	backgroundIframe.setAttribute('sandbox', 'allow-scripts allow-modals');

	backgroundIframe.addEventListener('load', async () => {
		backgroundIframe.contentWindow.postMessage({
			kind: 'add-script',
			script: `"use strict";
				${pluginBackgroundScript}

				(async () => {
					window.require = pluginBackgroundPage.requireModule;
					await pluginBackgroundPage.createPluginApiProxy(${JSON.stringify(messageChannelId)});
					${pluginScript}
				})();
			`,
		}, '*');

		// Chain connectionToParent with connectionToIframe
		const connectionToParent = new WebViewToRNMessenger<PluginWebViewApi, PluginApi>(messageChannelId, null);
		const connectionToIframe = new WindowMessenger<PluginWebViewApi, PluginApi>(
			messageChannelId, backgroundIframe.contentWindow, connectionToParent.remoteApi,
		);

		// The two messengers are intermediate links in a chain (they serve to forward messages
		// between the parent and the iframe).
		connectionToParent.setIsChainedMessenger(true);
		connectionToIframe.setIsChainedMessenger(true);

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

export const stopPlugin = async (pluginId: string) => {
	// Plugin not running?
	if (!pluginIdToIframe[pluginId]) {
		return;
	}

	pluginIdToIframe[pluginId].srcdoc = '';
	pluginIdToIframe[pluginId].remove();
	delete pluginIdToIframe[pluginId];
};

export const createPluginApiProxy = async (messageChannelId: string) => {
	const localApi = { };
	const messenger = new WindowMessenger<PluginWebViewApi, PluginApi>(messageChannelId, parent, localApi);
	await messenger.awaitRemoteReady();

	(window as any).joplin = messenger.remoteApi.api.joplin;
};
