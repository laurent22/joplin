import { RecognizeResult, RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from '../utils/types';
import { Worker, WorkerOptions, createWorker, RecognizeResult as TesseractRecognizeResult, OEM } from 'tesseract.js';
import OcrDriverBase from '../OcrDriverBase';
import { Minute } from '@joplin/utils/time';
import shim from '../../../shim';
import Logger from '@joplin/utils/Logger';
import filterOcrText from '../utils/filterOcrText';
import Resource from '../../../models/Resource';
import { ResourceOcrDriverId, ResourceOcrStatus } from '../../database/types';

const logger = Logger.create('OcrDriverTesseract');

interface Tesseract {
	createWorker: typeof createWorker;
}

interface WorkerWrapper {
	id: number;
	busy: boolean;
	instance: Worker;
}

let workerId_ = 1;

const formatTesseractBoundingBox = (boundingBox: Tesseract.Bbox): RecognizeResultBoundingBox => {
	return [boundingBox.x0, boundingBox.x1, boundingBox.y0, boundingBox.y1];
};

// 2023-12-13: Empirically, it seems anything below 70 is not usable. Between 70
// and 75 it's hit and miss, but often it's good enough that we should keep the result.
// Above this is usually reliable. Using 70 for now.
//
// 2025-04-03: Changed to 55 to detect text in images that are supported in
// other tools but were not in Joplin.
//
// https://github.com/laurent22/joplin/issues/11608
const minConfidence = 55;

interface Options {
	workerPath: string;
	corePath: string;
	languageDataPath: string|null;
}

export default class OcrDriverTesseract extends OcrDriverBase {

	private tesseract_: Tesseract = null;
	private workerPath_: string;
	private corePath_: string;
	private languageDataPath_: string|null = null;
	private workers_: Record<string, WorkerWrapper[]> = {};

	public constructor(tesseract: Tesseract, { workerPath, corePath, languageDataPath }: Options) {
		super();
		this.tesseract_ = tesseract;
		this.workerPath_ = workerPath;
		this.corePath_ = corePath;
		this.languageDataPath_ = languageDataPath;
	}

	public get driverId() {
		return ResourceOcrDriverId.PrintedText;
	}

	public static async clearLanguageDataCache() {
		if (typeof indexedDB === 'undefined') {
			throw new Error('Missing indexedDB access!');
		}

		logger.info('Clearing cached language data...');

		const requestAsPromise = <T> (request: IDBRequest) => {
			return new Promise<T>((resolve, reject) => {
				request.addEventListener('success', () => { resolve(request.result); });
				request.addEventListener('error', (event) => {
					if ('error' in event) {
						reject(new Error(`Request failed: ${event.error}`));
					} else {
						reject(new Error('Request failed with unknown error.'));
					}
				});
			});
		};

		const db = await requestAsPromise<IDBDatabase>(indexedDB.open('keyval-store'));
		const getStore = (mode: IDBTransactionMode) => {
			return db.transaction(['keyval'], mode).objectStore('keyval');
		};

		const allKeys = await requestAsPromise<string[]>(getStore('readonly').getAllKeys());
		const languageDataExtension = '.traineddata';
		const keysToClear = allKeys.filter(key => key.endsWith(languageDataExtension));
		for (const key of keysToClear) {
			logger.info('Clearing language data with key', key);
			await requestAsPromise(getStore('readwrite').delete(key));
		}
	}

	private async acquireWorker(language: string) {
		if (!this.workers_[language]) this.workers_[language] = [];

		const existingWorker = this.workers_[language].find(w => !w.busy);

		if (existingWorker) {
			existingWorker.busy = true;
			return existingWorker;
		}

		const createWorkerOptions: Partial<WorkerOptions> = {
			workerBlobURL: false,
		};

		if (this.workerPath_) createWorkerOptions.workerPath = this.workerPath_;
		if (this.corePath_) createWorkerOptions.corePath = this.corePath_;
		if (this.languageDataPath_) createWorkerOptions.langPath = this.languageDataPath_;

		const worker = await this.tesseract_.createWorker(language, OEM.LSTM_ONLY, createWorkerOptions);

		const output: WorkerWrapper = {
			id: workerId_++,
			instance: worker,
			busy: true,
		};

		logger.info(`Created worker: ${output.id}`);

		this.workers_[language].push(output);

		return output;
	}

	public async dispose() {
		for (const [language, workers] of Object.entries(this.workers_)) {
			for (const w of workers) {
				await w.instance.terminate();
			}
			this.workers_[language] = [];
		}
	}

	private async terminateWorker(id: number) {
		for (const [, workers] of Object.entries(this.workers_)) {
			const idx = workers.findIndex(w => w.id === id);
			if (idx < 0) continue;

			await workers[idx].instance.terminate();
			workers.splice(idx, 1);
			break;
		}
	}

	private async releaseWorker(worker: WorkerWrapper) {
		worker.busy = false;
	}

	public async recognize(language: string, filePath: string): Promise<RecognizeResult> {
		// eslint-disable-next-line no-async-promise-executor -- can't think of any way to handle the timeout without using `new Promise`
		return new Promise(async (resolve, reject) => {
			const worker = await this.acquireWorker(language);

			let hasTimedOut = false;
			const terminateTimeout_ = shim.setTimeout(async () => {
				await this.terminateWorker(worker.id);
				hasTimedOut = true;
				reject(new Error(`Recognize operation timed out on: ${filePath}`));
			}, 10 * Minute);

			let result: TesseractRecognizeResult = null;

			try {
				result = await worker.instance.recognize(filePath, {}, { text: false, blocks: true });
			} catch (e) {
				const error: Error = typeof e === 'string' ? new Error(e) : e;
				error.message = `Recognition failed on: ${filePath}: ${error.message}`;
				if (!hasTimedOut) reject(error);
				return;
			}

			if (hasTimedOut) return;

			shim.clearTimeout(terminateTimeout_);

			await this.releaseWorker(worker);

			interface GoodParagraph {
				text: string;
			}

			const goodParagraphs: GoodParagraph[] = [];
			let goodLines: RecognizeResultLine[] = [];

			for (const block of result.data.blocks) {

				for (const paragraph of block.paragraphs) {
					const lines: RecognizeResultLine[] = [];

					for (const line of paragraph.lines) {
						// If the line confidence is above the threshold we keep the
						// whole text. The confidence of individual words will vary and
						// may be below the treshold, but there's a chance they will
						// still be correct if the line as a whole is well recognised.
						if (line.confidence < minConfidence) continue;

						const lineBaselineAt = (x: number, top: boolean) => {
							const dy = line.baseline.y1 - line.baseline.y0;
							const dx = line.baseline.x1 - line.baseline.x0;
							// Avoid division by zero
							if (dx === 0) {
								return top ? line.baseline.y0 : line.baseline.y1;
							} else {
								const slope = dy / dx;
								return slope * (x - line.baseline.x0) + line.baseline.y0;
							}
						};

						const goodWords: RecognizeResultWord[] = line.words
							.map(w => {
								const baselineX1 = w.bbox.x0;
								const baselineY1 = lineBaselineAt(baselineX1, true);
								const baselineX2 = w.bbox.x1;
								const baselineY2 = lineBaselineAt(baselineX2, false);

								const output: RecognizeResultWord = {
									t: w.text,
									bb: formatTesseractBoundingBox(w.bbox),
									bl: [baselineX1, baselineX2, baselineY1, baselineY2],
								};

								return output;
							});

						lines.push({
							words: goodWords,
						});
					}

					goodParagraphs.push({
						text: lines.map(l => l.words.map(w => w.t).join(' ')).join('\n'),
					});

					goodLines = goodLines.concat(lines);
				}
			}

			resolve({
				// Note that Tesseract provides a `.text` property too, but it's the
				// concatenation of all lines, even those with a low confidence
				// score, so we recreate it here based on the good lines.
				ocr_text: filterOcrText(goodParagraphs.map(p => p.text).join('\n')),
				ocr_details: Resource.serializeOcrDetails(goodLines),
				ocr_status: ResourceOcrStatus.Done,
				ocr_error: '',
			});
		});
	}

}
