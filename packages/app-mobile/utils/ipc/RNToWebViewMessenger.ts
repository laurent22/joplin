
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewControl } from '../../components/ExtendedWebView';
import { RefObject } from 'react';
import { OnMessageEvent } from '../../components/ExtendedWebView/types';

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

		console.log('posting message...', message);
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

	public onWebViewMessage = (event: OnMessageEvent) => {
		console.log('got message1', event);
		if (!this.hasBeenClosed()) {
			void this.onMessage(JSON.parse(event.nativeEvent.data));
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
