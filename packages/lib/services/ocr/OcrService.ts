import { toIso639 } from '../../locale';
import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';
import OcrDriverBase from './OcrDriverBase';
import { RecognizeResult } from './utils/types';
import { Minute } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';
import filterOcrText from './utils/filterOcrText';

const logger = Logger.create('OcrService');

// From: https://github.com/naptha/tesseract.js/blob/master/docs/image-format.md
export const supportedMimeTypes = [
	'application/pdf',
	'image/bmp',
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/x-portable-bitmap',
];

export default class OcrService {

	private driver_: OcrDriverBase;
	private isRunningInBackground_ = false;
	private maintenanceTimer_: any = null;
	private pdfExtractDir_: string = null;
	private isProcessingResources_ = false;

	public constructor(driver: OcrDriverBase) {
		this.driver_ = driver;
	}

	private async pdfExtractDir(): Promise<string> {
		if (this.pdfExtractDir_ !== null) return this.pdfExtractDir_;
		const p = `${Setting.value('tempDir')}/ocr_pdf_extract`;
		await shim.fsDriver().mkdir(p);
		this.pdfExtractDir_ = p;
		return this.pdfExtractDir_;
	}

	private async recognize(language: string, resource: ResourceEntity): Promise<RecognizeResult> {
		if (resource.encryption_applied) throw new Error(`Cannot OCR encrypted resource: ${resource.id}`);

		const resourceFilePath = Resource.fullPath(resource);

		if (resource.mime === 'application/pdf') {
			const imageFilePaths = await shim.pdfToImages(resourceFilePath, await this.pdfExtractDir());
			const results: RecognizeResult[] = [];

			logger.info(`Processing ${imageFilePaths.length} PDF pages...`);

			for (const imageFilePath of imageFilePaths) {
				results.push(await this.driver_.recognize(language, imageFilePath));
			}

			for (const imageFilePath of imageFilePaths) {
				await shim.fsDriver().remove(imageFilePath);
			}

			return {
				text: results.map(r => r.text).join('\n'),
			};
		} else {
			return this.driver_.recognize(language, resourceFilePath);
		}
	}

	public async dispose() {
		await this.driver_.dispose();
	}

	public async processResources() {
		if (this.isProcessingResources_) {
			logger.info('Already processing resources - skipping');
			return;
		}

		this.isProcessingResources_ = true;

		const totalResourcesToProcess = await Resource.needOcrCount(supportedMimeTypes);
		const skippedResourceIds: string[] = [];

		const resourceInfo = (resource: ResourceEntity) => {
			return `${resource.id} (type ${resource.mime})`;
		};

		logger.info(`Found ${totalResourcesToProcess} resources to process...`);

		try {
			const language = toIso639(Setting.value('locale'));

			let totalProcessed = 0;

			while (true) {
				const resources = await Resource.needOcr(supportedMimeTypes, skippedResourceIds, {
					fields: [
						'id',
						'mime',
						'file_extension',
						'encryption_applied',
					],
				});

				if (!resources.length) break;

				for (const resource of resources) {
					logger.info(`Processing resource ${totalProcessed + 1} / ${totalResourcesToProcess}: ${resourceInfo(resource)}...`);

					const toSave: ResourceEntity = {
						id: resource.id,
					};

					try {
						const fetchStatus = await Resource.localState(resource.id);
						if (fetchStatus.fetch_status === Resource.FETCH_STATUS_ERROR) {
							throw new Error(`Cannot process resource ${resourceInfo(resource)} because it cannot be fetched from the server: ${fetchStatus.fetch_error}`);
						}

						if (fetchStatus.fetch_status !== Resource.FETCH_STATUS_DONE) {
							skippedResourceIds.push(resource.id);
							logger.info(`Skipping resource ${resourceInfo(resource)} because it has not been downloaded yet`);
							continue;
						}

						const result = await this.recognize(language, resource);
						toSave.ocr_status = ResourceOcrStatus.Done;
						toSave.ocr_text = filterOcrText(result.text);
						toSave.ocr_details = Resource.serializeOcrDetails(result.lines),
						toSave.ocr_error = '';
					} catch (error) {
						const errorMessage = typeof error === 'string' ? error : error?.message;
						logger.warn(`Could not process resource ${resourceInfo(resource)}`, error);
						toSave.ocr_status = ResourceOcrStatus.Error;
						toSave.ocr_text = '';
						toSave.ocr_details = '';
						toSave.ocr_error = errorMessage || 'Unknown error';
					}

					await Resource.save(toSave);
					totalProcessed++;
				}

				logger.info(`Processed ${totalProcessed} / ${totalResourcesToProcess} resources...`);
			}

			logger.info(`${totalProcessed} resources have been processed.`);
		} finally {
			this.isProcessingResources_ = false;
		}
	}

	public async maintenance() {
		await this.processResources();
	}

	public async runInBackground() {
		if (this.isRunningInBackground_) return;

		this.isRunningInBackground_ = true;

		if (this.maintenanceTimer_) return;

		logger.info('Starting background service...');

		await this.maintenance();

		this.maintenanceTimer_ = shim.setInterval(async () => {
			await this.maintenance();
			this.maintenanceTimer_ = null;
		}, 5 * Minute);
	}

	public stopRunInBackground() {
		logger.info('Stopping background service...');

		if (this.maintenanceTimer_) shim.clearInterval(this.maintenanceTimer_);
		this.maintenanceTimer_ = null;
		this.isRunningInBackground_ = false;
	}

}
