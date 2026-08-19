import { ResourceOcrDriverId } from '../database/types';
import { RecognizeResult } from './utils/types';

export default class OcrDriverBase {

	public async recognize(_language: string, _filePath: string, _id: string): Promise<RecognizeResult> {
		throw new Error('Not implemented');
	}

	public async dispose(): Promise<void> {}

	public get driverId() {
		return ResourceOcrDriverId.PrintedText;
	}

}
