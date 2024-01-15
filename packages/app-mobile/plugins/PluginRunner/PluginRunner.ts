import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginApiGlobal from '@joplin/lib/services/plugins/api/Global';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { WebViewControl } from '../../components/ExtendedWebView';
import { RefObject } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { PluginApi, PluginWebViewApi } from './types';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('PluginRunner');

type MessageEventListener = (event: WebViewMessageEvent)=> boolean;

export default class PluginRunner extends BasePluginRunner {
	private messageEventListeners: MessageEventListener[] = [];

	public constructor(private webviewRef: RefObject<WebViewControl>) {
		super();
	}

	public override async run(plugin: Plugin, pluginApi: PluginApiGlobal) {
		const pluginId = plugin.id;
		logger.info('Running plugin with id', pluginId);

		const onError = async (message: string) => {
			logger.error(`Plugin ${pluginId}: ${message}`);
		};

		const messageChannelId = `plugin-message-channel-${pluginId}-${Date.now()}`;
		const messenger = new RNToWebViewMessenger<PluginApi, PluginWebViewApi>(
			messageChannelId, this.webviewRef.current, { api: pluginApi, onError },
		);

		this.messageEventListeners.push((event) => {
			if (!messenger.hasBeenClosed()) {
				messenger.onWebViewMessage(event);
				return true;
			}
			return false;
		});

		this.webviewRef.current.injectJS(`
			const pluginScript = ${JSON.stringify(plugin.scriptText)};
			console.log('Running plugin with script', pluginScript);

			pluginBackgroundPage.runPlugin(
				${JSON.stringify(shim.injectedJs('pluginBackgroundPage'))},
				${JSON.stringify(plugin.scriptText)},
				${JSON.stringify(messageChannelId)},
				${JSON.stringify(plugin.id)},
			);
		`);

		messenger.onWebViewLoaded();
	}

	public override async stop(plugin: Plugin) {
		logger.info('Stopping plugin with id', plugin.id);

		this.webviewRef.current.injectJS(`
			pluginBackgroundPage.stopPlugin(${JSON.stringify(plugin.id)});
		`);
	}

	public onWebviewMessage(event: WebViewMessageEvent) {
		this.messageEventListeners = this.messageEventListeners.filter(
			// Remove all listeners that return false
			listener => listener(event),
		);
	}
}
