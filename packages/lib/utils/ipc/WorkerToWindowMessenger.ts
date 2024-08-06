import RemoteMessenger from './RemoteMessenger';
import { SerializableData } from './types';

export default class WorkerToWindowMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, localApi: LocalInterface|null) {
		super(channelId, localApi);

		self.addEventListener('message', this.handleMessageEvent);
		this.onReadyToReceive();
	}

	private handleMessageEvent = (event: MessageEvent) => {
		void this.onMessage(event.data);
	};

	protected override postMessage(message: SerializableData): void {
		self.postMessage(message);
	}

	protected override onClose(): void {
		self.removeEventListener('message', this.handleMessageEvent);
	}
}
