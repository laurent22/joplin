import RemoteMessenger from './RemoteMessenger';
import { SerializableData } from './types';

export default class WorkerMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	public constructor(channelId: string, private worker: Worker, localApi: LocalInterface|null) {
		super(channelId, localApi);

		worker.addEventListener('message', this.handleMessageEvent);

		this.onReadyToReceive();
	}

	private handleMessageEvent = (event: MessageEvent) => {
		void this.onMessage(event.data);
	};

	protected override postMessage(message: SerializableData): void {
		this.worker.postMessage(message);
	}

	protected override onClose(): void {
		this.worker.removeEventListener('message', this.handleMessageEvent);
	}
}
