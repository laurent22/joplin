import { toIso639 } from '../../locale';
import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';
import OcrDriverBase from './OcrDriverBase';
import { RecognizeResult } from './utils/types';
import { Minute } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('OcrService');

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
	private isRunningInBackground_ = false;
	private maintenanceTimer_: any = null;

	public constructor(driver: OcrDriverBase) {
		this.driver_ = driver;
	}

	private async recognize(language: string, resource: ResourceEntity): Promise<RecognizeResult> {
		if (resource.encryption_applied) throw new Error(`Cannot OCR encrypted resource: ${resource.id}`);
		return this.driver_.recognize(language, Resource.fullPath(resource));
	}

	public async dispose() {
		await this.driver_.dispose();
	}

	public async processResources() {
		const language = toIso639(Setting.value('locale'));

		let totalProcesed = 0;

		while (true) {
			const resources = await Resource.needOcr(supportedMimeTypes, {
				fields: [
					'id',
					'mime',
					'file_extension',
					'encryption_applied',
				],
			});

			logger.info(`Found ${resources.length} to process`);

			if (!resources.length) break;

			for (const resource of resources) {
				const toSave: ResourceEntity = {
					id: resource.id,
				};
				try {
					const result = await this.recognize(language, resource);
					toSave.ocr_status = ResourceOcrStatus.Done;
					toSave.ocr_text = result.text;
					toSave.ocr_words = Resource.serializeOcrWords(result.words);
					toSave.ocr_error = '';
				} catch (error) {
					logger.warn(`Could not process a resource: ${error.message}`);
					toSave.ocr_error = error.message;
					toSave.ocr_status = ResourceOcrStatus.Error;
				}

				await Resource.save(toSave);
				totalProcesed++;
			}
		}

		logger.info(`${totalProcesed} resources have been processed`);
	}

	public async maintenance() {
		logger.info('Processing resources...');
		await this.processResources();
		logger.info('Done processing resources');
	}

	public runInBackground() {
		if (this.isRunningInBackground_) return;

		this.isRunningInBackground_ = true;

		if (this.maintenanceTimer_) return;

		this.maintenanceTimer_ = shim.setTimeout(async () => {
			await this.maintenance();
			this.maintenanceTimer_ = null;
		}, 10 * Minute);
	}

}
