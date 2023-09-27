import { RecognizeResult } from '../utils/types';
import * as TesseractNamespace from 'tesseract.js';
import { Worker } from 'tesseract.js';
import { ResourceOcrWord } from '../../database/types';
import OcrDriverBase from '../OcrDriverBase';
type Tesseract = typeof TesseractNamespace;

export default class OcrDriverTesseract extends OcrDriverBase {

	private tesseract_: Tesseract = null;
	private workerPath_: string;
	private workers_: Record<string, Worker> = {};

	public constructor(tesseract: Tesseract, workerPath: string) {
		super();
		this.tesseract_ = tesseract;
		this.workerPath_ = workerPath;
	}

	private async getWorker(language: string) {
		if (this.workers_[language]) return this.workers_[language];

		const worker = await this.tesseract_.createWorker({
			workerPath: this.workerPath_,
			// logger: m => console.log(m),
			workerBlobURL: false,
		});

		await worker.loadLanguage(language);
		await worker.initialize(language);

		this.workers_[language] = worker;

		return worker;
	}

	public async recognize(language: string, filePath: string): Promise<RecognizeResult> {
		const worker = await this.getWorker(language);
		const result = await worker.recognize(filePath);

		let words: ResourceOcrWord[] = [];
		for (const line of result.data.lines) {
			words = words.concat(line.words.map(w => {
				return {
					text: w.text,
					bbox: w.bbox,
					baseline: w.baseline,
				};
			}));
		}

		return {
			text: result.data.text,
			words,
		};
	}

}
