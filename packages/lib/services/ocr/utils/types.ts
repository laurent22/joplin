import { ResourceOcrStatus } from '../../database/types';

export const emptyRecognizeResult = (): RecognizeResult => {
	return {
		ocr_status: ResourceOcrStatus.Todo,
		ocr_text: '',
		ocr_details: '',
		ocr_error: '',
	};
};

export type RecognizeResultBoundingBox = [number, number, number, number]; // x0, y0, x1, y1

export interface RecognizeResultWord {
	t: string;
	bb: RecognizeResultBoundingBox; // Bounding box;
	bl?: RecognizeResultBoundingBox; // Baseline
}

export interface RecognizeResultLine {
	words: RecognizeResultWord[];
}

export interface RecognizeResult {
	ocr_status: ResourceOcrStatus;
	ocr_text: string;
	ocr_details: string;
	ocr_error: string;
}
