
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

export default class WebViewToRNMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, localApi: LocalInterface) {
		super(channelId, localApi);

		(window as any).handleReactNativeMessage = (message: any) => {
			void this.onMessage(message);
		};

		// Allow the event loop to run -- without this, calling
		//   injectJS('window.handleReactNativeMessage("message")')
		// in ReactNative can (but doesn't always) fail if called immediately after
		// sending ReadyToReceive.
		setTimeout(() => {
			this.onReadyToReceive();
		}, 0);
	}

	protected override postMessage(message: SerializableData): void {
		(window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
	}
}
