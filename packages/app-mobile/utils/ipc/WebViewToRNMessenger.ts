
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

export default class WebViewToRNMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, localApi: LocalInterface) {
		super(channelId, localApi);

		(window as any).handleReactNativeMessage = (message: any) => {
			void this.onMessage(message);
		};
	}

	protected override postMessage(message: SerializableData): void {
		(window as any).ReactNativeWebView.postMessage(message);
	}
}
