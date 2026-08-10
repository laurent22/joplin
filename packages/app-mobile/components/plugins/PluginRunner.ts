import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginApiGlobal from '@joplin/lib/services/plugins/api/Global';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { WebViewControl } from '../ExtendedWebView/types';
import { RefObject } from 'react';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { PluginMainProcessApi, PluginWebViewApi } from './types';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import createOnLogHander from './utils/createOnLogHandler';
import { OnMessageEvent } from '../ExtendedWebView/types';

const logger = Logger.create('PluginRunner');

type MessageEventListener = (event: OnMessageEvent)=> boolean;

export default class PluginRunner extends BasePluginRunner {
	private messageEventListeners: MessageEventListener[] = [];

	public constructor(private webviewRef: RefObject<WebViewControl>) {
		super();
	}

	public override async run(plugin: Plugin, pluginApi: PluginApiGlobal) {
		const pluginId = plugin.id;
		logger.info('Running plugin with id', pluginId);

		const pluginLogger = Logger.create(`Plugin ${plugin.id}`);

		const onLog = createOnLogHander(plugin, pluginLogger);
		const onError = async (message: string) => {
			pluginLogger.error(message);
			plugin.hasErrors = true;
		};

		const messageChannelId = `plugin-message-channel-${pluginId}-${Date.now()}`;
		const messenger = new RNToWebViewMessenger<PluginMainProcessApi, PluginWebViewApi>(
			messageChannelId, this.webviewRef, { api: pluginApi, onError, onLog },
		);

		this.messageEventListeners.push((event) => {
			if (!messenger.hasBeenClosed()) {
				messenger.onWebViewMessage(event);
				return true;
			}
			return false;
		});

		// On native mobile, pass a file path so the WebView can load the
		// script directly from the filesystem (avoids transferring the full
		// script text across the React Native bridge). On web, file:// URLs
		// are blocked by CSP so we pass the script text directly.
		const scriptFilePath = plugin.scriptText ? '' : `${plugin.baseDir}/index.js`;
		this.webviewRef.current.injectJS(`
			pluginBackgroundPage.runPlugin(
				${JSON.stringify(shim.injectedJs('pluginBackgroundPage'))},
				${JSON.stringify(scriptFilePath)},
				${JSON.stringify(messageChannelId)},
				${JSON.stringify(plugin.id)},
				${JSON.stringify(plugin.scriptText)},
			);
		`);

		messenger.onWebViewLoaded();
	}

	public override async stop(plugin: Plugin) {
		logger.info('Stopping plugin with id', plugin.id);

		if (!this.webviewRef.current) {
			logger.debug('WebView already unloaded. Plugin already stopped. ID: ', plugin.id);
			return;
		}

		this.webviewRef.current.injectJS(`
			pluginBackgroundPage.stopPlugin(${JSON.stringify(plugin.id)});
		`);
	}

	public onWebviewMessage = (event: OnMessageEvent) => {
		this.messageEventListeners = this.messageEventListeners.filter(
			// Remove all listeners that return false
			listener => listener(event),
		);
	};
}
