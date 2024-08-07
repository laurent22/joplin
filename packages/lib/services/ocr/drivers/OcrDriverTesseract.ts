import { RecognizeResult, RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from '../utils/types';
import { Worker, WorkerOptions, createWorker, RecognizeResult as TesseractRecognizeResult, OEM } from 'tesseract.js';
import OcrDriverBase from '../OcrDriverBase';
import { Minute } from '@joplin/utils/time';
import shim from '../../../shim';
import Logger from '@joplin/utils/Logger';

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

// Empirically, it seems anything below 70 is not usable. Between 70 and 75 it's
// hit and miss, but often it's good enough that we should keep the result.
// Above this is usually reliable.
const minConfidence = 70;

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

	public static clearLanguageDataCache() {
		if (typeof indexedDB === 'undefined') {
			throw new Error('Missing indexedDB access!');
		}

		logger.info('Clearing language data cache');

		return new Promise<void>((resolve, reject) => {
			// Tesseract.js stores cached language data files in a database called "keyval-store".
			// Beware! This may impact plugins that use the same indexedDB name (if any).
			const request = indexedDB.deleteDatabase('keyval-store');

			request.addEventListener('success', () => { resolve(); });
			request.addEventListener('error', (event) => {
				if ('error' in event) {
					reject(new Error(`Error clearing language data: ${event.error}`));
				} else {
					reject(new Error('Unknown error while attempting to clear language data.'));
				}
			});
		});
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
				result = await worker.instance.recognize(filePath, {}, {
					text: false,
					blocks: true,
					hocr: false,
					tsv: false,
				});
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

			for (const paragraph of result.data.paragraphs) {
				const lines: RecognizeResultLine[] = [];

				for (const line of paragraph.lines) {
					// If the line confidence is above the threshold we keep the
					// whole text. The confidence of individual words will vary and
					// may be below the treshold, but there's a chance they will
					// still be correct if the line as a whole is well recognised.
					if (line.confidence < minConfidence) continue;

					const goodWords: RecognizeResultWord[] = line.words.map(w => {
						const output: RecognizeResultWord = {
							t: w.text,
							bb: formatTesseractBoundingBox(w.bbox),
						};

						if (w.baseline && w.baseline.has_baseline) output.bl = formatTesseractBoundingBox(w.baseline);

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

			resolve({
				// Note that Tesseract provides a `.text` property too, but it's the
				// concatenation of all lines, even those with a low confidence
				// score, so we recreate it here based on the good lines.
				text: goodParagraphs.map(p => p.text).join('\n'),
				lines: goodLines,
			});
		});
	}

}
