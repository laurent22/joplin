export const emptyRecognizeResult = (): RecognizeResult => {
	return {
		text: '',
		lines: [],
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
	text: string;
	lines?: RecognizeResultLine[]; // We do not store detailed data for PDFs
}
