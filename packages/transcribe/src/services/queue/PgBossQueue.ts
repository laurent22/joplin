import Logger from '@joplin/utils/Logger';
import PgBoss = require('pg-boss');
import { BaseQueue, JobData, JobWithData, JobWithResult, QueueConfiguration } from '../../types';
import { ErrorBadRequest } from '../../errors';
import { Day, Minute, Second } from '@joplin/utils/time';

const logger = Logger.create('PGBossQueue');

export default class PgBossQueue implements BaseQueue {

	private boss: PgBoss;
	private queue: string;
	private options: QueueConfiguration;

	public constructor(queue: string, options?: QueueConfiguration) {
		this.queue = queue;
		this.options = {
			ttl: 15 * Minute,
			retryCount: 2,
			maintenanceInterval: 60 * Second,
			database: {
				name: 'transcribe',
			},
			...options,
		};
		this.boss = new PgBoss({
			deleteAfterDays: 60,
			archiveCompletedAfterSeconds: (14 * Day) / 1000,
			archiveFailedAfterSeconds: (14 * Day) / 1000,
			maintenanceIntervalSeconds: Math.floor(this.options.maintenanceInterval / 1000),

			database: this.options.database.name,
			user: this.options.database.user,
			password: this.options.database.password,
			port: this.options.database.port,
			host: this.options.database.host,
		});
	}

	public async init() {
		logger.info('Starting pg-boss queue');

		this.boss.on('error', (error) => logger.error(error));

		await this.boss.start();
		await this.boss.createQueue(this.queue, {
			name: this.queue,
			retryLimit: this.options.retryCount,
			expireInSeconds: Math.floor(this.options.ttl / 1000),
		});
	}

	public async send(data: object) {
		const jobId = await this.boss.send(this.queue, data);
		// According to pg-boss documentation jobId might be null when throttle options are used
		// since it not our case we can consider that the job is created
		return jobId as string;
	}

	public async fetch() {
		const jobs = await this.boss.fetch<JobData>(this.queue, { batchSize: 1, includeMetadata: true });
		if (jobs.length === 0) return null;
		return jobs[0];
	}

	public async fail(jobId: string, error: Error) {
		return this.boss.fail(this.queue, jobId, error);
	}

	public async complete(jobId: string, data: object) {
		return this.boss.complete(this.queue, jobId, data);
	}

	public async getJobById(jobId: string) {
		const result = await this.boss.getJobById<object>(this.queue, jobId);
		if (!result) {
			throw new ErrorBadRequest(`Job does not exist ${jobId}`);
		}

		return result as JobWithResult;
	}

	public hasJobFailedTooManyTimes(job: JobWithData): boolean {
		return job.retryCount >= this.options.retryCount;
	}

	public async stop() {
		return this.boss.stop();
	}
}
