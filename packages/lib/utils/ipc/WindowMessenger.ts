import RemoteMessenger from './RemoteMessenger';
import { SerializableData } from './types';

export default class WindowMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private remoteWindow: Window, localApi: LocalInterface|null) {
		super(channelId, localApi);

		window.addEventListener('message', this.handleMessageEvent);

		this.onReadyToReceive();
	}

	private handleMessageEvent = (event: MessageEvent) => {
		console.log('got message event', event);
		if (event.source !== this.remoteWindow) {
			console.log('ignore');
			return;
		}

		void this.onMessage(event.data);
	};

	protected override postMessage(message: SerializableData): void {
		console.log('windowMessenger post', message);
		this.remoteWindow.postMessage(message, '*');
	}
}
