import { NativeModules } from 'react-native';

const { AudioRecordModule } = NativeModules;

export default class AudioRecorder {
	private sessionId: number|null;
	public constructor() { }

	public async start() {
		this.sessionId ??= await AudioRecordModule.openSession();
		await AudioRecordModule.startRecording(this.sessionId);
	}

	private async read(duration: number, blocking: boolean) {
		if (this.sessionId === null) {
			throw new Error('Invalid session ID. Call .start before .read.');
		}
		return Float32Array.from(
			await AudioRecordModule.pullData(this.sessionId, duration, blocking),
		);
	}

	public async readBlocking(duration: number) {
		return await this.read(duration, true);
	}


	public async readNonBlocking(duration: number) {
		return await this.read(duration, false);
	}

	public async close() {
		if (this.sessionId === null) return;

		await AudioRecordModule.closeSession(this.sessionId);
		this.sessionId = null;
	}
}
