
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

export default class WebViewToRNMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, localApi: LocalInterface) {
		super(channelId, localApi);

		window.addEventListener('message', this.handleMessage);

		// Allow the event loop to run -- without this, calling
		//   injectJS('window.handleReactNativeMessage("message")')
		// in ReactNative can (but doesn't always) fail if called immediately after
		// sending ReadyToReceive.
		setTimeout(() => {
			this.onReadyToReceive();
		}, 0);
	}

	private handleMessage = (message: MessageEvent) => {
		if (typeof message.data === 'object' && message.origin === 'react-native') {
			void this.onMessage(message.data);
		}
	};

	protected override postMessage(message: SerializableData): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
	}

	protected override onClose(): void {
		window.removeEventListener('message', this.handleMessage);
	}
}
