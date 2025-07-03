import { emptyRecognizeResult, RecognizeResult } from '../utils/types';
import OcrDriverBase from '../OcrDriverBase';
import Logger from '@joplin/utils/Logger';
import { ResourceOcrJobType, ResourceOcrStatus } from '../../database/types';
import Setting from '../../../models/Setting';
import KvStore from '../../KvStore';
import shim from '../../../shim';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
import { ServerApiClass, ServerApiInterface } from '../../../types';
import { msleep } from '@joplin/utils/time';
import Resource from '../../../models/Resource';

const logger = Logger.create('HtrDriver');

type CreateJobResult = { jobId: string };

export default class HtrDriver extends OcrDriverBase {

	private timeBetweenRequests = [10 * 1000, 15 * 1000, 30 * 1000, 60 * 1000];
	private api_: ServerApiInterface;
	private apiDriver: ServerApiClass;
	private JobIdKey = 'HtrDriver::JobId::';
	private shouldStopRequesting = false;

	public constructor(apiDriver: ServerApiClass, interval?: number[]) {
		super();
		this.timeBetweenRequests = interval ?? this.timeBetweenRequests;
		this.apiDriver = apiDriver;
	}

	public get driverId() {
		return ResourceOcrJobType.Htr;
	}

	public async recognize(_language: string, filePath: string, resourceId: string): Promise<RecognizeResult> {
		logger.info(`${resourceId}: Starting to recognize resource from ${filePath}`);

		const key = `${this.JobIdKey}${resourceId}`;
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
		const result: CreateJobResult = await this.api().exec('POST', 'api/transcribe', null, null, {
			'Content-Type': 'application/octet-stream',
		}, { path: filePath, source: 'file' });

		logger.info(`${resourceId}: Job queued`);
		return result.jobId;
	}

	private async checkJobIsFinished(jobId: string, resourceId: string) {
		logger.info(`${resourceId}: Checking if job is finished...`);
		let i = 0;
		while (true) {
			if (this.shouldStopRequesting) break;

			const response = await this.api().exec('GET', `api/transcribe/${jobId}`);

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
			ocr_error: 'HtrDriver was stopped while waiting for a transcription',
		};
	}

	private getInterval(index: number) {
		if (index >= this.timeBetweenRequests.length) {
			return this.timeBetweenRequests[this.timeBetweenRequests.length - 1];
		}
		return this.timeBetweenRequests[index];
	}

	private api() {
		if (this.api_) return this.api_;

		const syncTargetId = Setting.value('sync.target');

		if (!SyncTargetRegistry.isJoplinServerOrCloud(syncTargetId)) {
			throw new Error('The sync target is not set to Joplin Server or Cloud.');
		}

		this.api_ = new this.apiDriver({
			baseUrl: () => Setting.value(`sync.${syncTargetId}.path`),
			userContentBaseUrl: () => Setting.value(`sync.${syncTargetId}.userContentPath`),
			username: () => Setting.value(`sync.${syncTargetId}.username`),
			password: () => Setting.value(`sync.${syncTargetId}.password`),
			session: () => null,
		});

		return this.api_;
	}

	public dispose() {
		this.shouldStopRequesting = true;
		return Promise.resolve();
	}

}
