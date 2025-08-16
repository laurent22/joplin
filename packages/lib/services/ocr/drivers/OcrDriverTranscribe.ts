import { emptyRecognizeResult, RecognizeResult } from '../utils/types';
import OcrDriverBase from '../OcrDriverBase';
import Logger from '@joplin/utils/Logger';
import { ResourceOcrDriverId, ResourceOcrStatus } from '../../database/types';
import KvStore from '../../KvStore';
import shim from '../../../shim';
import { msleep } from '@joplin/utils/time';
import Resource from '../../../models/Resource';
import { reg } from '../../../registry';

const logger = Logger.create('OcrDriverTranscribe');

type CreateJobResult = { jobId: string };

export default class OcrDriverTranscribe extends OcrDriverBase {

	private retryIntervals_ = [10 * 1000, 15 * 1000, 30 * 1000, 60 * 1000];
	private jobIdKeyPrefix_ = 'OcrDriverTranscribe::JobId::';
	private disposed_ = false;

	public constructor(interval?: number[]) {
		super();
		this.retryIntervals_ = interval ?? this.retryIntervals_;
	}

	public get driverId() {
		return ResourceOcrDriverId.HandwrittenText;
	}

	public async recognize(_language: string, filePath: string, resourceId: string): Promise<RecognizeResult> {
		logger.info(`${resourceId}: Starting to recognize resource from ${filePath}`);

		const key = `${this.jobIdKeyPrefix_}${resourceId}`;
		let jobId = await KvStore.instance().value<string>(key);

		try {
			if (!jobId) {
				await Resource.save({
					id: resourceId,
					ocr_status: ResourceOcrStatus.Processing,
				});
				logger.info(`${resourceId}: Job does not exist yet, creating...`);
				jobId = await this.queueJob(filePath, resourceId);

				logger.info(`${resourceId}: Job created, reference: ${jobId}`);
				await KvStore.instance().setValue(key, jobId);
			}

			const ocrResult = await this.checkJobIsFinished(jobId, resourceId);
			await KvStore.instance().deleteValue(key);

			return {
				...emptyRecognizeResult(),
				...ocrResult,
			};
		} catch (error) {
			if (shim.fetchRequestCanBeRetried(error) || error.code === 503) {
				return emptyRecognizeResult();
			}
			await KvStore.instance().deleteValue(key);
			return {
				...emptyRecognizeResult(),
				ocr_status: ResourceOcrStatus.Error,
				ocr_error: error.message,
			};
		}
	}

	private async queueJob(filePath: string, resourceId: string) {
		const api = await this.api();

		const result: CreateJobResult = await api.exec('POST', 'api/transcribe', null, null, {
			'Content-Type': 'application/octet-stream',
		}, { path: filePath, source: 'file' });

		logger.info(`${resourceId}: Job queued`);
		return result.jobId;
	}

	private async checkJobIsFinished(jobId: string, resourceId: string) {
		logger.info(`${resourceId}: Checking if job is finished...`);
		let i = 0;
		while (true) {
			if (this.disposed_) break;

			const api = await this.api();

			const response = await api.exec('GET', `api/transcribe/${jobId}`);

			if (this.disposed_) break;

			if (response.state === 'completed') {
				logger.info(`${resourceId}: Finished.`);
				return {
					ocr_status: ResourceOcrStatus.Done,
					ocr_text: response.output.result,
				};
			} else if (response.state === 'failed') {
				logger.info(`${resourceId}: Failed.`);
				return {
					ocr_status: ResourceOcrStatus.Error,
					ocr_error: response.output,
				};
			}

			logger.info(`${resourceId}: Job not finished yet, waiting... ${this.getInterval(i)}`);
			await msleep(this.getInterval(i));
			i += 1;
		}

		return {
			ocr_status: ResourceOcrStatus.Error,
			ocr_error: 'OcrDriverTranscribe was stopped while waiting for a transcription',
		};
	}

	private getInterval(index: number) {
		if (index >= this.retryIntervals_.length) {
			return this.retryIntervals_[this.retryIntervals_.length - 1];
		}
		return this.retryIntervals_[index];
	}

	private async api() {
		const fileApi = await reg.syncTarget().fileApi();
		return fileApi.driver().api();
	}

	public dispose() {
		this.disposed_ = true;
		return Promise.resolve();
	}

}
