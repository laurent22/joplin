import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import AudioRecorder from '../../utils/AudioRecorder';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('Whisper');

export type OnTextCallback = (text: string)=> void;

const localeToDecoderIds = {
	'en': [50258, 50259, 50359, 50363],
	'fr': [50258, 50265, 50359, 50363],
	'es': [50258, 50262, 50359, 50363],
	'de': [50258, 50261, 50359, 50363],
};

export default class Whisper {
	private session: InferenceSession|null = null;
	private recorder: AudioRecorder = new AudioRecorder();

	private constructor(
		private modelPath: string,
		private locale: string,
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
		return new Whisper(destPath, locale, onText);
	}

	public async start() {
		if (this.session) {
			await this.stop();
		}

		try {
			this.session = await InferenceSession.create(
				this.modelPath,
			);

			logger.debug('starting recorder');
			await this.recorder.start();
			logger.debug('recorder started');

			while (true) {
				logger.debug('reading block');
				const data = await this.recorder.readBlocking(5);
				logger.debug('done reading block. Length', data?.length);

				if (this.session === null) {
					return;
				}

				this.onText(await this.process(data));
			}
		} catch (error) {
			logger.error('Whisper error:', error);
			await this.stop();
			throw error;
		}
	}

	private async process(data: Float32Array) {
		const intTensor = (num: number) => {
			return new Tensor(Int32Array.from([num]), [1]);
		};
		const floatTensor = (num: number) => {
			return new Tensor(Float32Array.from([num]), [1]);
		};

		const decoderInputIds = localeToDecoderIds.hasOwnProperty(this.locale) ? (
			localeToDecoderIds[this.locale as keyof typeof localeToDecoderIds]
		) : [50258];

		// See https://github.com/microsoft/onnxruntime-inference-examples/blob/main/js/ort-whisper/
		const feeds = {
			audio_pcm: new Tensor(data, [1, data.length]),
			max_length: intTensor(200),
			min_length: intTensor(1),
			num_return_sequences: intTensor(1),
			num_beams: intTensor(2),
			length_penalty: floatTensor(1),
			repetition_penalty: floatTensor(1),
			decoder_input_ids: new Tensor(new Int32Array(decoderInputIds), [1, decoderInputIds.length]),
		};
		const result = await this.session.run(feeds);
		return result.str.data[0] as string;
	}

	public async stop() {
		await this.session.release();
		await this.recorder.close();
		this.session = null;
	}
}
