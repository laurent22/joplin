import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { NativeModules } from 'react-native';

const logger = Logger.create('Whisper');

export type OnTextCallback = (text: string)=> void;

const { SpeechToTextModule } = NativeModules;


export default class Whisper {
	private constructor(
		private sessionId: number|null,
		private onText: OnTextCallback,
	) { }

	private static getModelPath() {
		return `${shim.fsDriver().getCacheDirectoryPath()}/whisper-models/model-tiny.onnx`;
	}

	public static async mustDownload() {
		return !await shim.fsDriver().exists(this.getModelPath());
	}

	public static async fetched(locale: string, onText: OnTextCallback) {
		const url = 'http://localhost:8000/model-tiny.onnx';
		const destPath = this.getModelPath();
		if (await this.mustDownload()) {
			await shim.fetchBlob(url, { path: destPath });
		}

		const sessionId = await SpeechToTextModule.openSession(destPath, locale);
		return new Whisper(sessionId, onText);
	}

	public async start() {
		if (this.sessionId === null) {
			throw new Error('Session closed.');
		}
		try {
			logger.debug('starting recorder');
			await SpeechToTextModule.startRecording(this.sessionId);
			logger.debug('recorder started');

			while (true) {
				logger.debug('reading block');
				const data = await SpeechToTextModule.expandBufferAndConvert(this.sessionId, 3);
				logger.debug('done reading block. Length', data?.length);

				if (this.sessionId === null) {
					return;
				}

				// TODO: Merge with the previous data (may need to enable model output timestamps).
				this.onText(`\n${data}`);
			}
		} catch (error) {
			logger.error('Whisper error:', error);
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
		await SpeechToTextModule.closeSession(sessionId);
	}
}
