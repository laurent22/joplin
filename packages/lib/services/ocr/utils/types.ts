import { ResourceOcrWord } from '../../database/types';

export const emptyRecognizeResult = (): RecognizeResult => {
	return {
		text: '',
		words: [],
	};
};

export interface RecognizeResult {
	text: string;
	words: ResourceOcrWord[];
}
