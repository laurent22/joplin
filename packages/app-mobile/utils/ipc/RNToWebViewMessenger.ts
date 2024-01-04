
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewMessageEvent } from 'react-native-webview';
import { WebViewControl } from '../../components/ExtendedWebView';

export default class RNToWebViewMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private webviewControl: WebViewControl, localApi: LocalInterface) {
		super(channelId, localApi);
	}

	protected override postMessage(message: SerializableData): void {
		console.log('RNToWebView: postMsg', message);
		this.webviewControl.injectJS(`window.handleReactNativeMessage?.(${JSON.stringify(message)});`);
	}

	public onWebViewMessage = (event: WebViewMessageEvent) => {
		console.log('RNToWebViewMessenger', event.nativeEvent.data);
		void this.onMessage(JSON.parse(event.nativeEvent.data));
	};

	public onWebViewLoaded = () => {
		this.onReadyToReceive();
	};
}
