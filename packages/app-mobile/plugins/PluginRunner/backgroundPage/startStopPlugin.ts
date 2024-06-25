import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { PluginMainProcessApi, PluginWebViewApi } from '../types';
import WebViewToRNMessenger from '../../../utils/ipc/WebViewToRNMessenger';
import WindowMessenger from '@joplin/lib/utils/ipc/WindowMessenger';
import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';

type PluginRecord = {
	iframe: HTMLIFrameElement;
	connectionToParent: RemoteMessenger<PluginWebViewApi, PluginMainProcessApi>|null;
	connectionToIframe: RemoteMessenger<PluginMainProcessApi, PluginWebViewApi>|null;
};

const loadedPlugins: Record<string, PluginRecord> = Object.create(null);

export const stopPlugin = async (pluginId: string) => {
	if (!loadedPlugins[pluginId]) {
		return;
	}

	loadedPlugins[pluginId].connectionToIframe?.closeConnection?.();
	loadedPlugins[pluginId].connectionToParent?.closeConnection?.();

	const iframe = loadedPlugins[pluginId].iframe;
	iframe.srcdoc = '';
	iframe.remove();
	delete loadedPlugins[pluginId];
};

export const runPlugin = (
	pluginBackgroundScript: string, pluginScript: string, messageChannelId: string, pluginId: string,
) => {
	if (loadedPlugins[pluginId]) {
		console.warn(`Plugin already running ${pluginId}`);
		return;
	}

	const bodyHtml = '';
	const initialJavaScript = `
		"use strict";
		${pluginBackgroundScript}

		(async () => {
			window.require = function(module) {
				return pluginBackgroundPage.requireModule(module, ${JSON.stringify(pluginId)});
			};
			window.exports = window.exports || {};

			await pluginBackgroundPage.initializePluginBackgroundIframe(${JSON.stringify(messageChannelId)});

			${pluginScript}
		})();
	`;
	const backgroundIframe = makeSandboxedIframe({ bodyHtml, headHtml: '', scripts: [initialJavaScript] }).iframe;

	loadedPlugins[pluginId] = {
		iframe: backgroundIframe,
		connectionToParent: null,
		connectionToIframe: null,
	};

	backgroundIframe.addEventListener('load', async () => {
		if (!loadedPlugins[pluginId]) {
			return;
		}

		const connectionToParent = new WebViewToRNMessenger<PluginWebViewApi, PluginMainProcessApi>(messageChannelId, null);
		const connectionToIframe = new WindowMessenger<PluginMainProcessApi, PluginWebViewApi>(
			messageChannelId, backgroundIframe.contentWindow, connectionToParent.remoteApi,
		);

		// The two messengers are intermediate links in a chain (they serve to forward messages
		// between the parent and the iframe).
		connectionToParent.setIsChainedMessenger(true);
		connectionToIframe.setIsChainedMessenger(true);

		connectionToParent.setLocalInterface(connectionToIframe.remoteApi);

		loadedPlugins[pluginId].connectionToIframe = connectionToIframe;
		loadedPlugins[pluginId].connectionToParent = connectionToParent;
	}, { once: true });

	document.body.appendChild(backgroundIframe);
};
