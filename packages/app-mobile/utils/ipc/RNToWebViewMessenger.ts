
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewMessageEvent } from 'react-native-webview';
import { WebViewControl } from '../../components/ExtendedWebView';
import { RefObject } from 'react';
import { Platform } from 'react-native';

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
							data: JSON.parse(${JSON.stringify(message)}),
							origin: 'react-native'
						},
					),
				);
			`);
		}
	}

	public onWebViewMessage = (event: WebViewMessageEvent) => {
		if (!this.hasBeenClosed()) {
			if (canUseOptimizedPostMessage) {
				void this.onMessage(event.nativeEvent.data);
			} else {
				void this.onMessage(JSON.parse(event.nativeEvent.data));
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
