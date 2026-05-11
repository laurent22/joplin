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

export const runPlugin = async (
	pluginBackgroundScript: string, scriptFilePath: string, messageChannelId: string, pluginId: string, scriptText = '',
) => {
	if (loadedPlugins[pluginId]) {
		console.warn(`Plugin already running ${pluginId}`);
		return;
	}

	// When scriptText is provided (web), use it directly. Otherwise load
	// the plugin script from the filesystem (native mobile). We use
	// XMLHttpRequest because fetch() doesn't support file:// URLs on
	// Android WebView.
	let pluginScript = scriptText;
	if (!pluginScript) {
		pluginScript = await new Promise<string>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('GET', `file://${scriptFilePath}`, true);
			xhr.onload = () => resolve(xhr.responseText);
			xhr.onerror = () => reject(new Error(`Failed to load plugin script: ${scriptFilePath}`));
			xhr.send();
		});
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
