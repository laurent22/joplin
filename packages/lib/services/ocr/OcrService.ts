import { toIso639Alpha3 } from '../../locale';
import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';
import { ResourceEntity, ResourceOcrDriverId, ResourceOcrStatus } from '../database/types';
import OcrDriverBase from './OcrDriverBase';
import { emptyRecognizeResult, RecognizeResult } from './utils/types';
import { Minute } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';
import TaskQueue from '../../TaskQueue';
import eventManager, { EventName } from '../../eventManager';

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

const resourceInfo = (resource: ResourceEntity) => {
	return `${resource.id} (type ${resource.mime})`;
};

const getOcrDriverId = (resource: ResourceEntity) => {
	// Default to PrintedText. When syncing with certain (older?) clients, resources can be assigned an
	// ocr_driver_id of zero.
	// https://github.com/laurent22/joplin/issues/13043
	return resource.ocr_driver_id === 0 ? ResourceOcrDriverId.PrintedText : resource.ocr_driver_id;
};

export default class OcrService {

	private drivers_: OcrDriverBase[];
	private isRunningInBackground_ = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private maintenanceTimer_: any = null;
	private pdfExtractDir_: string = null;
	private isProcessingResources_ = false;
	private printedTextQueue_: TaskQueue = null;
	private handwrittenTextQueue_: TaskQueue = null;

	public constructor(drivers: OcrDriverBase[]) {
		this.drivers_ = drivers;
		this.printedTextQueue_ = new TaskQueue('printed', logger);
		this.printedTextQueue_.setConcurrency(5);
		this.printedTextQueue_.keepTaskResults = false;

		this.handwrittenTextQueue_ = new TaskQueue('handwritten', logger);
		this.handwrittenTextQueue_.setConcurrency(1);
		this.handwrittenTextQueue_.keepTaskResults = false;
	}

	private async pdfExtractDir(): Promise<string> {
		if (this.pdfExtractDir_ !== null) return this.pdfExtractDir_;
		const p = `${Setting.value('tempDir')}/ocr_pdf_extract`;
		await shim.fsDriver().mkdir(p);
		this.pdfExtractDir_ = p;
		return this.pdfExtractDir_;
	}

	public get running() {
		return this.runInBackground;
	}

	private async recognize(language: string, resource: ResourceEntity): Promise<RecognizeResult|null> {
		if (resource.encryption_applied) throw new Error(`Cannot OCR encrypted resource: ${resource.id}`);

		if (getOcrDriverId(resource) === ResourceOcrDriverId.HandwrittenText && !Setting.value('ocr.handwrittenTextDriverEnabled')) {
			logger.debug('Skipping OCR of', resource.id, 'with the HandwrittenText driver. The HTR driver has been disabled by the user.');
			return null;
		}

		const resourceFilePath = Resource.fullPath(resource);

		const driver = this.drivers_.find(d => d.driverId === getOcrDriverId(resource));
		if (!driver) throw new Error(`Unknown driver ID: ${resource.ocr_driver_id}`);

		if (resource.mime === 'application/pdf') {
			// OCR can be slow for large PDFs.
			// Skip it if the PDF already includes text.
			const pageTexts = await shim.pdfExtractEmbeddedText(resourceFilePath);
			const pagesWithText = pageTexts.filter(text => !!text.trim().length);

			if (pagesWithText.length > 0) {
				return {
					...emptyRecognizeResult(),
					ocr_status: ResourceOcrStatus.Done,
					ocr_text: pageTexts.join('\n'),
				};
			}

			const imageFilePaths = await shim.pdfToImages(resourceFilePath, await this.pdfExtractDir());
			const results: RecognizeResult[] = [];

			let pageIndex = 0;
			for (const imageFilePath of imageFilePaths) {
				logger.info(`Recognize: ${resourceInfo(resource)}: Processing PDF page ${pageIndex + 1} / ${imageFilePaths.length}...`);
				results.push(await driver.recognize(language, imageFilePath, resource.id));
				pageIndex++;
			}

			for (const imageFilePath of imageFilePaths) {
				await shim.fsDriver().remove(imageFilePath);
			}

			return {
				...emptyRecognizeResult(),
				ocr_status: ResourceOcrStatus.Done,
				ocr_text: results.map(r => r.ocr_text).join('\n'),
			};
		} else {
			return driver.recognize(language, resourceFilePath, resource.id);
		}
	}

	public async dispose() {
		for (const d of this.drivers_) {
			await d.dispose();
		}
	}

	public async processResources() {
		if (this.isProcessingResources_) return;

		this.isProcessingResources_ = true;

		const totalResourcesToProcess = await Resource.needOcrCount(supportedMimeTypes);
		const skippedResourceIds: string[] = [];

		logger.info(`Found ${totalResourcesToProcess} resources to process...`);

		const makeQueueAction = (totalProcessed: number, language: string, resource: ResourceEntity) => {
			return async () => {
				logger.info(`Processing resource ${totalProcessed + 1} / ${totalResourcesToProcess}: ${resourceInfo(resource)}...`);

				let toSave: ResourceEntity = {
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
						return;
					}

					const recognizeResult = await this.recognize(language, resource);
					if (recognizeResult) {
						toSave = {
							...toSave,
							...recognizeResult,
						};
					}
				} catch (error) {
					const errorMessage = typeof error === 'string' ? error : error?.message;
					logger.warn(`Could not process resource ${resourceInfo(resource)}`, error);
					toSave.ocr_status = ResourceOcrStatus.Error;
					toSave.ocr_text = '';
					toSave.ocr_details = '';
					toSave.ocr_error = errorMessage || 'Unknown error';
				}

				await Resource.save(toSave);
			};
		};

		try {
			const language = toIso639Alpha3(Setting.value('locale'));
			const processedResourceIds: string[] = [];

			// Queue all resources for processing
			let lastProcessedCount = -1;
			while (processedResourceIds.length > lastProcessedCount) {
				lastProcessedCount = processedResourceIds.length;

				const resources = await Resource.needOcr(supportedMimeTypes, skippedResourceIds.concat(processedResourceIds), 100, {
					fields: [
						'id',
						'mime',
						'file_extension',
						'encryption_applied',
						'ocr_driver_id',
					],
				});

				for (const resource of resources) {
					const makeCurrentQueueAction = () => makeQueueAction(processedResourceIds.length, language, resource);

					let processed = true;
					if (getOcrDriverId(resource) === ResourceOcrDriverId.PrintedText) {
						await this.printedTextQueue_.pushAsync(resource.id, makeCurrentQueueAction());
					} else if (getOcrDriverId(resource) === ResourceOcrDriverId.HandwrittenText) {
						await this.handwrittenTextQueue_.pushAsync(resource.id, makeCurrentQueueAction());
					} else {
						logger.info('Skipped processing', resource.id, 'with OCR: Unsupported ocr_driver_id', resource.ocr_driver_id);
						processed = false;
					}

					if (processed) {
						processedResourceIds.push(resource.id);
					} else {
						skippedResourceIds.push(resource.id);
					}
				}
			}

			// Wait for processing to finish
			await this.printedTextQueue_.waitForAll();
			await this.handwrittenTextQueue_.waitForAll();

			const totalProcessed = processedResourceIds.length;
			if (totalProcessed) {
				eventManager.emit(EventName.OcrServiceResourcesProcessed);
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

	public async stopRunInBackground() {
		logger.info('Stopping background service...');

		if (this.maintenanceTimer_) shim.clearInterval(this.maintenanceTimer_);
		this.maintenanceTimer_ = null;
		this.isRunningInBackground_ = false;
		await this.printedTextQueue_.stop();
		await this.handwrittenTextQueue_.stop();
	}

}
