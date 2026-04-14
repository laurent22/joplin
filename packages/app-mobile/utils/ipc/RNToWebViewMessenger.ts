
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewControl } from '../../components/ExtendedWebView/types';
import { RefObject } from 'react';
import { OnMessageEvent } from '../../components/ExtendedWebView/types';
import { Platform } from 'react-native';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('RNToWebViewMessenger');

const canUseOptimizedPostMessage = Platform.OS === 'web';

export default class RNToWebViewMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private webviewControl: WebViewControl|RefObject<WebViewControl>, localApi: LocalInterface) {
		super(channelId, localApi);
	}

	protected override postMessage(message: SerializableData): void {
		const webviewControl = (this.webviewControl as RefObject<WebViewControl>).current ?? (this.webviewControl as WebViewControl);

		// This can happen just after the WebView unloads.
		if (!webviewControl) return;

		// This is the case in testing environments where no WebView is available.
		if (!webviewControl.injectJS) return;

		if (canUseOptimizedPostMessage) {
			webviewControl.postMessage(message);
		} else {
			webviewControl.injectJS(`
				window.dispatchEvent(
					new MessageEvent(
						'message',
						{
							data: ${JSON.stringify(message)},
							origin: 'react-native'
						},
					),
				);
			`);
		}
	}

	public onWebViewMessage = (event: OnMessageEvent) => {
		if (!this.hasBeenClosed()) {
			let data;
			if (canUseOptimizedPostMessage) {
				data = event.nativeEvent.data;
			} else {
				try {
					data = JSON.parse(event.nativeEvent.data);
				} catch {
					logger.warn('Failed to parse message:', event.nativeEvent.data);
					return;
				}
			}

			if (typeof data === 'object' && data !== null && typeof data.kind === 'string') {
				void this.onMessage(data);
			} else {
				logger.info('Unknown message format:', event.nativeEvent.data);
			}
		}
	};

	public onWebViewLoaded = () => {
		// Send onReadyToReceive again (if needed).
		//
		// This is necessary because any events sent before the webview finished loading
		// may not have been delivered (though they may have).
		this.onReadyToReceive();
	};

	protected override onClose(): void {
	}
}
