export const emptyRecognizeResult = (): RecognizeResult => {
	return {
		text: '',
	};
};

export interface RecognizeResult {
	text: string;
}
