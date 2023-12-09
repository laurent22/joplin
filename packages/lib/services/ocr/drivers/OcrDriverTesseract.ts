import { RecognizeResult, RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from '../utils/types';
import { Worker, WorkerOptions, createWorker } from 'tesseract.js';
import OcrDriverBase from '../OcrDriverBase';

interface Tesseract {
	createWorker: typeof createWorker;
}

const formatTesseractBoundingBox = (boundingBox: Tesseract.Bbox): RecognizeResultBoundingBox => {
	return [boundingBox.x0, boundingBox.x1, boundingBox.y0, boundingBox.y1];
};

// Empirically, it seems anything below 70 is not usable. Between 70 and 75 it's
// hit and miss, but often it's good enough that we should keep the result.
// Above this is usually reliable.
const minConfidence = 70;

export default class OcrDriverTesseract extends OcrDriverBase {

	private tesseract_: Tesseract = null;
	private workerPath_: string|null = null;
	private corePath_: string|null = null;
	private workers_: Record<string, Worker> = {};

	public constructor(tesseract: Tesseract, workerPath: string|null = null, corePath: string|null = null) {
		super();
		this.tesseract_ = tesseract;
		this.workerPath_ = workerPath;
		this.corePath_ = corePath;
	}

	private async getWorker(language: string) {
		if (this.workers_[language]) return this.workers_[language];

		const createWorkerOptions: Partial<WorkerOptions> = {
			workerBlobURL: false,
		};

		if (this.workerPath_) createWorkerOptions.workerPath = this.workerPath_;
		if (this.corePath_) createWorkerOptions.corePath = this.corePath_;

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

		const result = await worker.recognize(filePath, {}, {
			text: false,
			blocks: true,
			hocr: false,
			tsv: false,
		});

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

		return {
			// Note that Tesseract provides a `.text` property too, but it's the
			// concatenation of all lines, even those with a low confidence
			// score, so we recreate it here based on the good lines.
			text: goodParagraphs.map(p => p.text).join('\n'),
			lines: goodLines,
		};
	}

}
