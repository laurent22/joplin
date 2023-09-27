import { iso639_1to2 } from '../../locale';
import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';
import OcrDriverBase from './OcrDriverBase';
import { RecognizeResult } from './utils/types';

// From: https://github.com/naptha/tesseract.js/blob/master/docs/image-format.md
const supportedMimeTypes = [
	'image/bmp',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/x-portable-bitmap',
	'image/webp',
];

export default class OcrService {

	private driver_: OcrDriverBase;

	public constructor(driver: OcrDriverBase) {
		this.driver_ = driver;
	}

	private async recognize(language: string, resource: ResourceEntity): Promise<RecognizeResult> {
		if (resource.encryption_applied) throw new Error(`Cannot OCR encrypted resource: ${resource.id}`);
		return this.driver_.recognize(language, Resource.fullPath(resource));
	}

	public async processResources() {
		const language = iso639_1to2(Setting.value('locale'));

		while (true) {
			const resources = await Resource.needOcr(supportedMimeTypes, {
				fields: [
					'id',
					'mime',
					'file_extension',
					'encryption_applied',
				],
			});

			if (!resources.length) break;

			for (const resource of resources) {
				const toSave: ResourceEntity = {
					id: resource.id,
				};
				try {
					const result = await this.recognize(language, resource);
					toSave.ocr_status = ResourceOcrStatus.Done;
					toSave.ocr_text = result.text;
					toSave.ocr_words = JSON.stringify(result.words);
					toSave.ocr_error = '';
				} catch (error) {
					toSave.ocr_error = error.message;
					toSave.ocr_status = ResourceOcrStatus.Error;
				}

				await Resource.save(resource);
			}
		}
	}

}
