
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';
import { WebViewMessageEvent } from 'react-native-webview';
import { WebViewControl } from '../../components/ExtendedWebView';

export default class RNToWebViewMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private webviewControl: WebViewControl, localApi: LocalInterface) {
		super(channelId, localApi);
	}

	protected override postMessage(message: SerializableData): void {
		this.webviewControl.postMessage(JSON.stringify(message));
	}

	public onWebViewMessage = (event: WebViewMessageEvent) => {
		void this.onMessage(JSON.parse(event.nativeEvent.data));
	};

	public onWebViewLoaded = () => {
		this.onReadyToReceive();
	};
}
