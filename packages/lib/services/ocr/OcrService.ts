import * as TesseractNamespace from 'tesseract.js';
import { Worker } from 'tesseract.js';
import Resource from '../../models/Resource';
import { ResourceEntity, ResourceOcrWord } from '../database/types';
type Tesseract = typeof TesseractNamespace;

// From: https://github.com/naptha/tesseract.js/blob/master/docs/image-format.md
const supportedMimeTypes = [
	'image/bmp',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/x-portable-bitmap',
	'image/webp',
];

export interface RecognizeResult {
	text: string;
	words: ResourceOcrWord[];
}

export default class OcrService {

	private tesseract_: Tesseract = null;
	private workerPath_: string;
	private workers_: Record<string, Worker> = {};

	public constructor(tesseract: Tesseract, workerPath: string) {
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

	public async recognize(language: string, resource: ResourceEntity): Promise<RecognizeResult|null> {
		if (resource.encryption_applied) throw new Error(`Cannot OCR encrypted resource: ${resource.id}`);
		if (supportedMimeTypes.includes(resource.mime)) return null;

		const worker = await this.getWorker(language);
		const result = await worker.recognize(Resource.fullPath(resource));

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

	public async processResources() {
		while (true) {
			const resources = await Resource.needOcr({
				fields: [
					'id',
					'mime',
					'file_extension',
					'encryption_applied',
				],
			});

			if (!resources.length) break;

			// for (const resource of resources) {
			// 	try {

			// 	} catch (error) {

			// 	}
			// }


		}
	}

}
