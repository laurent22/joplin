import { NitroModules } from 'react-native-nitro-modules';
import type { AudioRecorder, SessionOptions, WhisperSession, WhisperVoiceTyping } from './specs/Whisper.nitro';

let WhisperVoiceTypingHybridObject: WhisperVoiceTyping|null = null;

export type { SessionOptions };

const getVoiceTyping = () => {
	WhisperVoiceTypingHybridObject ??= NitroModules.createHybridObject<WhisperVoiceTyping>('WhisperVoiceTyping');
	return WhisperVoiceTypingHybridObject;
};

export class Session {
	private recorder_: AudioRecorder|null = null;
	private nativeSession_: WhisperSession|null = null;
	private convertCancellationCounter_ = 0;

	public constructor(private options_: SessionOptions) {}

	private isOpen_() {
		return this.recorder_ || this.nativeSession_;
	}

	public open() {
		if (this.isOpen_()) {
			this.close();
		}

		this.recorder_ = NitroModules.createHybridObject<AudioRecorder>('AudioRecorder');
		this.nativeSession_ = getVoiceTyping().openSession(this.options_);
		this.recorder_.start();
	}

	public async convertNext(duration: number|null) {
		if (!this.nativeSession_ || !this.recorder_) {
			throw new Error('No available session! Call .open() before .convertNext().');
		}

		this.convertCancellationCounter_++;
		const cancelCounter = this.convertCancellationCounter_;

		if (duration) {
			await this.recorder_.waitForData(duration);
		}

		// Cancelled?
		if (cancelCounter !== this.convertCancellationCounter_) {
			return '';
		}

		const available = this.recorder_.pullAvailable();
		this.nativeSession_.pushAudio(available);
		return this.nativeSession_.convertNext();
	}

	public close() {
		this.recorder_?.stop();

		// Allow recorder_ and nativeSession_ to be garbage collected:
		this.recorder_ = null;
		this.nativeSession_ = null;
		this.convertCancellationCounter_++;
	}
}

export function openSession(options: SessionOptions) {
	return new Session(options);
}

export function test() {
	return getVoiceTyping().test();
}
