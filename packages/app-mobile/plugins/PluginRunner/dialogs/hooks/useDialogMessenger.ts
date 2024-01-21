import { useMemo, RefObject } from 'react';
import { DialogMainProcessApi, DialogWebViewApi } from '../../types';
import PluginWebviewController from '@joplin/lib/services/plugins/WebviewController';
import { LoggerWrapper } from '@joplin/utils/Logger';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { WebViewControl } from '../../../../components/ExtendedWebView';
import createOnLogHander from '../../utils/createOnLogHandler';
import RNToWebViewMessenger from '../../../../utils/ipc/RNToWebViewMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

interface Props {
	plugin: Plugin;
	viewController: PluginWebviewController;
	pluginLogger: LoggerWrapper;
	webviewRef: RefObject<WebViewControl>;
}

export const messageChannelId = 'dialog-messenger';

const useDialogMessenger = (props: Props) => {
	const { viewController, plugin, pluginLogger, webviewRef } = props;

	return useMemo(() => {
		const dialogApi: DialogMainProcessApi = {
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
			},
			onDismiss: async () => {
				viewController.closeWithResponse(null);
			},
			onError: async (error: string) => {
				pluginLogger.error(`Unhandled error: ${error}`);
				plugin.hasErrors = true;
			},
			onLog: createOnLogHander(plugin, pluginLogger),
		};

		return new RNToWebViewMessenger<DialogMainProcessApi, DialogWebViewApi>(
			messageChannelId, webviewRef, dialogApi,
		);
	}, [webviewRef, plugin, viewController, pluginLogger]);
};

export default useDialogMessenger;
