import { RefObject } from 'react';
import { WebViewControl } from '../../components/ExtendedWebView';
import { WebViewMessageEvent } from 'react-native-webview';
import { PluginHtmlContents, PluginViewState, ViewInfo } from '@joplin/lib/services/plugins/reducer';
import WebviewController, { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { DialogLocalApi, DialogRemoteApi } from './types';
import shim from '@joplin/lib/shim';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import Logger from '@joplin/utils/Logger';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { _ } from '@joplin/lib/locale';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

const logger = Logger.create('PluginViewController');

interface DialogRecord {
	viewInfo: ViewInfo;
	messenger: RNToWebViewMessenger<DialogRemoteApi, DialogLocalApi>;
}

type SetWebViewVisibleCallback = (visible: boolean)=> void;

const getDialogHandle = (viewInfo: ViewInfo) => {
	return `${viewInfo.plugin.id}--${viewInfo.view.id}`;
};

export default class PluginViewController {
	private visibleDialogs: Map<string, DialogRecord> = new Map();
	private pluginHtmlContents: PluginHtmlContents;
	private themeCss = '';

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
			const dialogHandle = getDialogHandle(viewInfo);
			if (!view.opened) {
				if (this.visibleDialogs.has(dialogHandle)) {
					this.closeDialog(viewInfo);
				}
				continue;
			}
			if (this.visibleDialogs.has(dialogHandle)) {
				const currentDialog = this.visibleDialogs.get(dialogHandle);
				if (currentDialog.viewInfo.view.buttons !== viewInfo.view.buttons) {
					this.updateDialogButtons(dialogHandle, viewInfo.view.buttons);
				}
				continue;
			}

			if (view.containerType === ContainerType.Dialog) {
				void this.showDialog(viewInfo);
			}
		}
	}

	private closeDialog(viewInfo: ViewInfo) {
		const dialogHandle = getDialogHandle(viewInfo);

		if (this.visibleDialogs.has(dialogHandle)) {
			const messenger = this.visibleDialogs.get(dialogHandle).messenger;
			messenger.remoteApi.closeDialog();

			this.visibleDialogs.delete(dialogHandle);
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
		const viewController = plugin.viewController(viewInfo.view.id) as WebviewController;

		let submitted = false;
		const dialogApi: DialogRemoteApi = {
			postMessage: async (message: SerializableData) => {
				return await viewController.emitMessage({ message });
			},

			onMessage: async (callback) => {
				viewController.onMessage(callback);
			},
			onSubmit: async (buttonId: string, formData: any) => {
				if (buttonId === 'cancel') {
					formData = undefined;
				}
				viewController.closeWithResponse({ id: buttonId, formData });
				submitted = true;
			},
			onDismiss: async () => {
				if (!submitted) {
					viewController.closeWithResponse(null);
					submitted = true;
				}
				this.closeDialog(viewInfo);
			},
			onError: async (error: string) => {
				logger.error(`Plugin ${pluginState.id} dialog error: ${error}`);
			},
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
		const dialogHandle = getDialogHandle(viewInfo);
		this.visibleDialogs.set(dialogHandle, { messenger, viewInfo });

		const defaultButtons: ButtonSpec[] = [
			{ id: 'ok' }, { id: 'cancel' },
		];
		this.updateDialogButtons(dialogHandle, view.buttons ?? defaultButtons);
		messenger.remoteApi.setCss(this.themeCss);

		// Dialogs are shown by scripts that originally run in the webview. Thus,
		// the webview has already loaded.
		messenger.onWebViewLoaded();
	}

	private updateDialogButtons(dialogHandle: string, buttons: ButtonSpec[]) {
		const dialog = this.visibleDialogs.get(dialogHandle);

		buttons = buttons.map(button => {
			let title = button.title;

			if (button.id === 'ok' && !title) {
				title = _('OK');
			} else if (button.id === 'cancel' && !title) {
				title = _('Cancel');
			}

			return {
				title,
				...button,
			};
		});
		dialog.messenger.remoteApi.setButtons(buttons);
	}

	public onThemeChange(themeCss: string) {
		this.themeCss = themeCss;

		for (const dialog of this.visibleDialogs.values()) {
			dialog.messenger.remoteApi.setCss(this.themeCss);
		}
	}

	public onWebViewMessage(message: WebViewMessageEvent) {
		for (const dialog of this.visibleDialogs.values()) {
			dialog.messenger.onWebViewMessage(message);
		}
	}
}
