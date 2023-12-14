import { RecognizeResult } from './utils/types';

export default class OcrDriverBase {

	public async recognize(_language: string, _filePath: string): Promise<RecognizeResult> {
		throw new Error('Not implemented');
	}

	public async dispose(): Promise<void> {}

}
