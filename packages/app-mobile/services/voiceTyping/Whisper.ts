import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { NativeModules } from 'react-native';

const logger = Logger.create('Whisper');

export type OnTextCallback = (text: string)=> void;

const { SpeechToTextModule } = NativeModules;

export interface SpeechToTextCallbacks {
	// Called with a block of text that might change in the future
	onPreview: OnTextCallback;
	// Called with text that will not change and should be added to the document
	onFinalize: OnTextCallback;
}

// Timestamps are in the form <|0.00|>. They seem to be added mostly just between sentences.
const timestampExp = /<\|(\d+\.\d+)\|>/g;
const postProcessSpeech = (text: string) => {
	return text.replace(timestampExp, '').replace(/\[BLANK_AUDIO\]/g, '');
};

export default class Whisper {
	private lastData: string;
	private closeCounter = 0;

	private constructor(
		private sessionId: number|null,
		private callbacks: SpeechToTextCallbacks,
	) { }

	private static getModelPath() {
		return `${shim.fsDriver().getCacheDirectoryPath()}/whisper-models/model_tiny_with_timestamps.onnx`;
	}

	public static async mustDownload() {
		// await shim.fsDriver().remove(this.getModelPath());
		return !await shim.fsDriver().exists(this.getModelPath());
	}

	public static async fetched(locale: string, callbacks: SpeechToTextCallbacks) {
		const url = 'http://localhost:8000/model_tiny_with_timestamps.onnx';
		const destPath = this.getModelPath();
		if (await this.mustDownload()) {
			await shim.fetchBlob(url, { path: destPath });
		}

		const sessionId = await SpeechToTextModule.openSession(destPath, locale);
		return new Whisper(sessionId, callbacks);
	}

	public async start() {
		if (this.sessionId === null) {
			throw new Error('Session closed.');
		}
		try {
			logger.debug('starting recorder');
			await SpeechToTextModule.startRecording(this.sessionId);
			logger.debug('recorder started');

			const loopStartCounter = this.closeCounter;
			while (this.closeCounter === loopStartCounter) {
				logger.debug('reading block');
				const data: string = await SpeechToTextModule.expandBufferAndConvert(this.sessionId, 2);
				logger.debug('done reading block. Length', data?.length);

				if (this.sessionId === null) {
					logger.debug('Session stopped. Ending inference loop.');
					return;
				}

				const timestamps = data.matchAll(timestampExp);

				// Trim to one of the first nonzero timestamps
				let trimTo = 0;
				let dataBeforeTrim = '';
				let dataAfterTrim = '';
				for (const timestampMatch of timestamps) {
					const timestamp = Number(timestampMatch[1]);
					// Should always be a finite number (i.e. not NaN)
					if (!isFinite(timestamp)) throw new Error(`Timestamp match failed with ${timestampMatch[0]}`);

					if (timestamp > 2) {
						trimTo = timestamp;
						dataBeforeTrim = data.substring(0, timestampMatch.index);
						dataAfterTrim = data.substring(timestampMatch.index + timestampMatch[0].length);
						break;
					}
				}

				const recordingLength = await SpeechToTextModule.getBufferLengthSeconds(this.sessionId);
				if (trimTo > 0 && trimTo < recordingLength * 2 / 3) {
					logger.debug('Trim to', trimTo, 'in recording with length', recordingLength);
					this.callbacks.onFinalize(postProcessSpeech(dataBeforeTrim));
					this.callbacks.onPreview(postProcessSpeech(dataAfterTrim));
					await SpeechToTextModule.dropFirstSeconds(this.sessionId, trimTo);
				} else {
					logger.debug('Preview', data);
					this.callbacks.onPreview(postProcessSpeech(data));
				}

				this.lastData = data;
			}
		} catch (error) {
			logger.error('Whisper error:', error);
			this.lastData = '';
			await this.stop();
			throw error;
		}
	}

	public async stop() {
		if (this.sessionId === null) {
			logger.warn('Session already closed.');
			return;
		}

		const sessionId = this.sessionId;
		this.sessionId = null;
		this.closeCounter ++;
		await SpeechToTextModule.closeSession(sessionId);

		if (this.lastData) {
			this.callbacks.onFinalize(this.lastData);
		}
	}
}
