import RemoteMessenger from './RemoteMessenger';
import { SerializableData } from './types';

// This allows using a WindowMessenger in a web worker, with window-like objects.
const getLocalWindow = () => {
	return typeof window !== 'undefined' ? window : self;
};

export default class WindowMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private remoteWindow: Window, localApi: LocalInterface|null) {
		super(channelId, localApi);

		getLocalWindow().addEventListener('message', this.handleMessageEvent);

		this.onReadyToReceive();
	}

	private handleMessageEvent = (event: MessageEvent) => {
		if (event.source !== this.remoteWindow) {
			return;
		}

		void this.onMessage(event.data);
	};

	protected override postMessage(message: SerializableData): void {
		this.remoteWindow.postMessage(message, '*');
	}

	protected override onClose(): void {
		getLocalWindow().removeEventListener('message', this.handleMessageEvent);
	}
}
