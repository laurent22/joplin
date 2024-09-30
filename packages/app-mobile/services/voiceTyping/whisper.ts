import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { rtrimSlashes } from '@joplin/utils/path';
import { NativeModules } from 'react-native';
import { SpeechToTextCallbacks, VoiceTypingProvider, VoiceTypingSession } from './VoiceTyping';

const logger = Logger.create('voiceTyping/whisper');

const { SpeechToTextModule } = NativeModules;

// Timestamps are in the form <|0.00|>. They seem to be added mostly just between sentences.
const timestampExp = /<\|(\d+\.\d*)\|>/g;
const postProcessSpeech = (text: string) => {
	return text.replace(timestampExp, '').replace(/\[BLANK_AUDIO\]/g, '');
};

class Whisper implements VoiceTypingSession {
	private lastPreviewData: string;
	private closeCounter = 0;

	public constructor(
		private sessionId: number|null,
		private callbacks: SpeechToTextCallbacks,
	) { }

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
				const data: string = await SpeechToTextModule.expandBufferAndConvert(this.sessionId, 4);
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
					this.lastPreviewData = dataAfterTrim;
					await SpeechToTextModule.dropFirstSeconds(this.sessionId, trimTo);
				} else {
					logger.debug('Preview', data);
					this.lastPreviewData = data;
					this.callbacks.onPreview(postProcessSpeech(data));
				}
			}
		} catch (error) {
			logger.error('Whisper error:', error);
			this.lastPreviewData = '';
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

		if (this.lastPreviewData) {
			this.callbacks.onFinalize(postProcessSpeech(this.lastPreviewData));
		}
	}
}

const modelLocalFilepath = () => {
	return `${shim.fsDriver().getAppDirectoryPath()}/voice-typing-models/whisper_tiny.onnx`;
};

const whisper: VoiceTypingProvider = {
	supported: () => !!SpeechToTextModule,
	modelLocalFilepath: modelLocalFilepath,
	getDownloadUrl: () => {
		let urlTemplate = rtrimSlashes(Setting.value('voiceTypingBaseUrl').trim());

		if (!urlTemplate) {
			urlTemplate = 'https://github.com/personalizedrefrigerator/joplin-voice-typing-test/releases/download/test-release/{task}.zip';
		}

		return urlTemplate.replace(/\{task\}/g, 'whisper_tiny.onnx');
	},
	build: async ({ modelPath, callbacks, locale }) => {
		const sessionId = await SpeechToTextModule.openSession(modelPath, locale);
		return new Whisper(sessionId, callbacks);
	},
	modelName: 'whisper',
};

export default whisper;