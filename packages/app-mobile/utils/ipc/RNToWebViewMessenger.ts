
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewMessageEvent } from 'react-native-webview';
import { WebViewControl } from '../../components/ExtendedWebView';
import { RefObject } from 'react';

export default class RNToWebViewMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private webviewControl: WebViewControl|RefObject<WebViewControl>, localApi: LocalInterface) {
		super(channelId, localApi);
	}

	protected override postMessage(message: SerializableData): void {
		const webviewControl = (this.webviewControl as RefObject<WebViewControl>).current ?? (this.webviewControl as WebViewControl);

		// This can happen just after the WebView unloads.
		if (!webviewControl) return;

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

	public onWebViewMessage = (event: WebViewMessageEvent) => {
		if (!this.hasBeenClosed()) {
			void this.onMessage(JSON.parse(event.nativeEvent.data));
		}
	};

	public onWebViewLoaded = () => {
		this.onReadyToReceive();
	};

	protected override onClose(): void {
	}
}
