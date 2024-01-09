import { RefObject } from 'react';
import { WebViewControl } from '../../components/ExtendedWebView';
import { WebViewMessageEvent } from 'react-native-webview';
import { PluginHtmlContents, PluginViewState, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { DialogLocalApi, DialogRemoteApi } from './types';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Logger from '@joplin/utils/Logger';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { _ } from '@joplin/lib/locale';

const logger = Logger.create('PluginViewController');

interface DialogRecord {
	viewInfo: ViewInfo;
	messenger: RNToWebViewMessenger<DialogRemoteApi, DialogLocalApi>;
}

type SetWebViewVisibleCallback = (visible: boolean)=> void;

export default class PluginViewController {
	private visibleDialogs: Map<string, DialogRecord> = new Map();
	private pluginHtmlContents: PluginHtmlContents;

	public constructor(
		private webviewRef: RefObject<WebViewControl>,
		private setWebViewVisible: SetWebViewVisibleCallback,
	) {

	}

	public onPluginHtmlContentsUpdated(pluginHtmlContents: PluginHtmlContents) {
		this.pluginHtmlContents = pluginHtmlContents;
	}

	public onViewInfosUpdated(pluginViews: ViewInfo[]) {
		for (const viewInfo of pluginViews) {
			const view = viewInfo.view;
			if (!view.opened) {
				if (this.visibleDialogs.has(view.id)) {
					this.closeDialog(viewInfo);
				}
				continue;
			}
			if (this.visibleDialogs.has(view.id)) {
				// TODO: Support updating buttons.
				continue;
			}

			if (view.containerType === ContainerType.Dialog) {
				void this.showDialog(viewInfo);
			}
		}
	}

	private closeDialog(viewInfo: ViewInfo) {
		const viewId = viewInfo.view.id;

		if (this.visibleDialogs.has(viewId)) {
			const messenger = this.visibleDialogs.get(viewId).messenger;
			messenger.remoteApi.closeDialog();

			this.visibleDialogs.delete(viewId);
		}

		if ([...this.visibleDialogs.values()].length === 0) {
			this.setWebViewVisible(false);
		}
	}

	private async showDialog(viewInfo: ViewInfo) {
		const messageChannelId = `dialog-${viewInfo.plugin.id}-${viewInfo.view.id}`;

		logger.info(`Showing dialog ${viewInfo.view.id} from plugin ${viewInfo.plugin.id}...`);
		this.setWebViewVisible(true);

		const pluginState = viewInfo.plugin;
		const plugin = PluginService.instance().pluginById(pluginState.id);
		const dialogApi: DialogRemoteApi = {
			// TODO:
			postMessage: async () => null,
			onMessage: async () => null,
			onSubmit: async () => null,
			onDismiss: async () => this.closeDialog(viewInfo),
		};

		const messenger = new RNToWebViewMessenger<DialogRemoteApi, DialogLocalApi>(
			messageChannelId, this.webviewRef, dialogApi,
		);
		const html = this.pluginHtmlContents[plugin.id]?.[viewInfo.view.id] ?? '';

		const view = viewInfo.view;
		const dialogInfo: Partial<PluginViewState> = {
			// Only copy JSON-ifyable data
			id: view.id,
			type: view.type,
			opened: view.opened,
			fitToContent: view.fitToContent,
			scripts: view.scripts,
			html,
			commandName: view.commandName,
			location: view.location,
			containerType: view.containerType,
		};

		this.webviewRef.current.injectJS(`
			const pluginScript = ${JSON.stringify(plugin.scriptText)};
			console.log('Running plugin with script', pluginScript);

			pluginBackgroundPage.openDialog(
				${JSON.stringify(messageChannelId)},
				${JSON.stringify(shim.injectedJs('pluginBackgroundPage'))},
				${JSON.stringify(dialogInfo)},
			);
		`);

		const defaultButtons: ButtonSpec[] = [
			{ id: 'ok', title: _('OK') }, { id: 'cancel', title: _('Cancel') },
		];
		messenger.remoteApi.setButtons(view.buttons ?? defaultButtons);

		this.visibleDialogs.set(view.id, { messenger, viewInfo });

		// TODO:
		messenger.onWebViewLoaded();
	}

	public onWebViewMessage(message: WebViewMessageEvent) {
		for (const dialog of this.visibleDialogs.values()) {
			dialog.messenger.onWebViewMessage(message);
		}
	}
}
