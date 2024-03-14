import RemoteMessenger from './RemoteMessenger';
import { SerializableData } from './types';

export default class TestMessenger<LocalInterface, RemoteInterface> extends RemoteMessenger<LocalInterface, RemoteInterface> {
	private remoteMessenger: TestMessenger<RemoteInterface, LocalInterface>|null = null;

	public constructor(channelId: string, localApi: LocalInterface|null) {
		super(channelId, localApi);
	}

	public connectTo(other: TestMessenger<RemoteInterface, LocalInterface>) {
		if (this.remoteMessenger === other) {
			return;
		}

		if (this.remoteMessenger !== null) {
			throw new Error('TestMessengers can only be connected to a single other messenger');
		}

		this.remoteMessenger = other;
		this.remoteMessenger.connectTo(this);
		this.onReadyToReceive();
	}

	protected override postMessage(message: SerializableData) {
		if (!this.remoteMessenger) {
			throw new Error('No remote messenger has been registered for this TestMessenger. (Was .connectTo called?)');
		}

		void this.remoteMessenger.onMessage(message);
	}

	protected override onClose(): void {
		this.remoteMessenger = null;
	}


	// Test utility methods
	//
	public mockCallbackDropped(callbackId: string) {
		this.dropRemoteCallback_(callbackId);
	}
}
