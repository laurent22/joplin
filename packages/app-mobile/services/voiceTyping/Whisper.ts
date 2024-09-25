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
		await shim.fsDriver().remove(this.getModelPath());
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
				const duration = 5;
				const blocking = true;
				const data = await SpeechToTextModule.pullData(this.sessionId, duration, blocking);
				logger.debug('done reading block. Length', data?.length);

				if (this.sessionId === null) {
					return;
				}

				this.onText(data);
			}
		} catch (error) {
			logger.error('Whisper error:', error);
			await this.stop();
			throw error;
		}
	}

	public async stop() {
		const sessionId = this.sessionId;
		this.sessionId = null;
		await SpeechToTextModule.closeSession(sessionId);
	}
}
