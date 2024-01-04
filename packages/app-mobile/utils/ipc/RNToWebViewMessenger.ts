
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
		webviewControl.injectJS(`window.handleReactNativeMessage?.(${JSON.stringify(message)});`);
	}

	public onWebViewMessage = (event: WebViewMessageEvent) => {
		void this.onMessage(JSON.parse(event.nativeEvent.data));
	};

	public onWebViewLoaded = () => {
		this.onReadyToReceive();
	};
}
