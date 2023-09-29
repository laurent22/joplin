import { RecognizeResult } from '../utils/types';
import { Worker, WorkerOptions, createWorker } from 'tesseract.js';
import { ResourceOcrWord } from '../../database/types';
import OcrDriverBase from '../OcrDriverBase';

interface Tesseract {
	createWorker: typeof createWorker;
}

// Empirically, it seems anything below 70 is not usable. Between 70 and 75 it's
// hit and miss, but often it's good enough that we should keep the result.
// Above this is usually reliable.
const minConfidence = 70;

export default class OcrDriverTesseract extends OcrDriverBase {

	private tesseract_: Tesseract = null;
	private workerPath_: string|null = null;
	private workers_: Record<string, Worker> = {};

	public constructor(tesseract: Tesseract, workerPath: string|null = null) {
		super();
		this.tesseract_ = tesseract;
		this.workerPath_ = workerPath;
	}

	private async getWorker(language: string) {
		if (this.workers_[language]) return this.workers_[language];

		const createWorkerOptions: Partial<WorkerOptions> = {
			workerBlobURL: false,
		};

		if (this.workerPath_) createWorkerOptions.workerPath = this.workerPath_;

		const worker = await this.tesseract_.createWorker(createWorkerOptions);

		await worker.loadLanguage(language);
		await worker.initialize(language);

		this.workers_[language] = worker;

		return worker;
	}

	public async dispose() {
		for (const [, worker] of Object.entries(this.workers_)) {
			await worker.terminate();
		}
		this.workers_ = {};
	}

	public async recognize(language: string, filePath: string): Promise<RecognizeResult> {
		const worker = await this.getWorker(language);
		const result = await worker.recognize(filePath);

		result.data.paragraphs;

		let words: ResourceOcrWord[] = [];

		interface GoodParagraph {
			lines: string[];
			text: string;
		}

		const goodParagraphs: GoodParagraph[] = [];

		for (const paragraph of result.data.paragraphs) {
			const goodLines: string[] = [];

			for (const line of paragraph.lines) {
				if (line.confidence < minConfidence) continue;

				const goodWords = line.words.map(w => {
					const baseline = w.baseline.has_baseline ? {
						x0: w.baseline.x0,
						x1: w.baseline.x1,
						y0: w.baseline.y0,
						y1: w.baseline.y1,
					} : null;

					const output: ResourceOcrWord = {
						text: w.text,
						bbox: w.bbox,
					};

					if (baseline) output.baseline = baseline;

					return output;
				});
				words = words.concat(goodWords);

				goodLines.push(goodWords.map(w => w.text).join(' '));
			}

			goodParagraphs.push({
				lines: goodLines,
				text: goodLines.join('\n'),
			});
		}

		return {
			// Note that Tesseract provides a `.text` property too, but it's the
			// concatenation of all lines, even those with a low confidence
			// score, so we recreate it here based on the good lines.
			text: goodParagraphs.map(p => p.text).join('\n'),
			words,
		};
	}

}
