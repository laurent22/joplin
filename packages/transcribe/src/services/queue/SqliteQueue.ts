import { BaseQueue, JobData, JobStates, jobStateToEnum, JobWithData, QueueConfiguration, Result } from '../../types';
import KnexConstructor, { Knex } from 'knex';
import Logger from '@joplin/utils/Logger';
import { formatMsToUTC, goBackInTime, Minute, msleep, Second } from '@joplin/utils/time';
import { ErrorBadRequest } from '../../errors';
import { Job } from 'knex/types/tables';

const logger = Logger.create('SqliteQueue');

export default class SqliteQueue implements BaseQueue {

	private sqlite: Knex<Knex.Table>;
	private name: string;
	private maintenanceIntervalRef: NodeJS.Timer | undefined;
	private isMaintenanceRunning = false;
	private options: QueueConfiguration;

	public constructor(name: string, options?: QueueConfiguration) {
		this.name = name;
		this.options = {
			ttl: 15 * Minute,
			retryCount: 2,
			maintenanceInterval: 60 * Second,
			database: {
				name: 'SqliteQueue.sqlite3',
			},
			...options,
		};
		this.sqlite = KnexConstructor({
			client: 'sqlite3',
			useNullAsDefault: true,
			connection: {
				filename: this.options.database.name,
			},
		});
	}

	public async init(isPrimary: boolean) {
		logger.info('Starting sqlite-queue');
		await this.sqlite.migrate.latest({
			directory: './dist/sqlite_queue_migrations',
		});

		await this.createQueue();
		if (isPrimary) {
			await this.scheduleMaintenance();
		}
	}

	private async createQueue() {
		const isQueueCreated = await this.sqlite.select('*').from('queue').where({ name: this.name }).first();
		if (isQueueCreated) return;

		return this.sqlite.insert({ name: this.name }).table('queue');
	}

	private async createJob(jobWithData: Partial<Job>) {
		const result = await this.sqlite.insert({ ...jobWithData }).table('job').returning('id');
		if (result && result.length) {
			return result[0].id;
		}
		throw new Error(`Something went wrong when creating the job: ${result}`);
	}

	public async send(data: JobData) {
		let retry = 0;
		const retryInterval = (iteration: number) => 500 * iteration;
		while (retry < 3) {
			retry += 1;
			try {
				return this.createJob({ data: JSON.stringify(data), name: this.name });
			} catch (error) {
				if (error !== null && typeof error === 'object' && 'code' in error) {
					if (error.code === 'SQLITE_BUSY') {
						logger.info(`Could not create job, retrying again in... ${retryInterval(retry)}ms`);
						await msleep(retryInterval(retry));
						continue;
					}
				}
				throw error;
			}
		}
		throw new Error('It was not possible to create job at the moment');
	}

	public async fetch() {
		const job = await this.sqlite.select('*')
			.table('job')
			.where({ state: JobStates.Created })
			.orWhere({ state: JobStates.Retry })
			.orderBy('created_on')
			.first();

		if (!job) {
			return null;
		}

		await this.sqlite.update({
			state: JobStates.Active,
			started_on: this.sqlite.fn.now(),
			updated_on: this.sqlite.fn.now(),
		}).table('job').where({ id: job.id });

		return {
			id: job.id,
			retryCount: job.retry_count,
			data: JSON.parse(job.data),
		};
	}

	public async fail(jobId: string, error: Error) {

		const rightNow = this.sqlite.fn.now();

		await this.sqlite.update({
			state: this.sqlite.raw(`
			CASE
			  WHEN retry_count < ? THEN '${JobStates.Retry}'
			  ELSE '${JobStates.Failed}'
			END
		  `, [this.options.retryCount]),
			retry_count: this.sqlite.raw(`
			CASE
			  WHEN retry_count < ? THEN retry_count + 1
			  ELSE retry_count
			END
		  `, [this.options.retryCount]),
			completed_on: this.sqlite.raw(`
			CASE
			  WHEN retry_count >= ? THEN ?
			  ELSE NULL
			END
		  `, [this.options.retryCount, rightNow]),
			output: JSON.stringify({ stack: error.stack, message: error.message }),
			updated_on: rightNow,
		})
			.table('job')
			.where({ id: jobId });
	}

	public async complete(jobId: string, data: Result) {
		await this.sqlite.update({
			state: JobStates.Completed,
			completed_on: this.sqlite.fn.now(),
			updated_on: this.sqlite.fn.now(),
			output: JSON.stringify({ result: data.result }),
		}).table('job').where({ id: jobId });
	}

	public async getJobById(jobId: string) {
		const job = await this.sqlite.select('*').table('job').where({ id: jobId }).first();
		if (!job) {
			throw new ErrorBadRequest(`Job does not exist ${jobId}`);
		}

		return {
			id: job.id,
			completedOn: job.completed_on ? new Date(job.completed_on) : undefined,
			output: job.output ? JSON.parse(job.output) : undefined,
			state: jobStateToEnum(job.state),
		};
	}

	private async scheduleMaintenance() {
		this.maintenanceIntervalRef = setInterval(async () => {
			if (this.isMaintenanceRunning) return;

			this.isMaintenanceRunning = true;
			logger.info('Running maintenance...');
			const t = await this.maintenance();
			logger.info(`Finished maintenance on ${t} records`);
			this.isMaintenanceRunning = false;
		}, this.options.maintenanceInterval);
	}

	public async maintenance() {
		return this.expireActiveJobs();
	}

	private async expireActiveJobs() {
		try {
			const expired = goBackInTime(new Date().getTime(), this.options.ttl, 'milliseconds');
			const time = formatMsToUTC(expired.unix() * 1000, 'YYYY-MM-DD HH:mm:ss');
			return this.sqlite
				.update({ state: JobStates.Retry })
				.increment('retry_count', 1)
				.table('job')
				.where({ state: JobStates.Active })
				.andWhere('started_on', '<', time)
				.andWhere('retry_count', '<', this.options.retryCount);

		} catch (error) {
			if (error !== null && typeof error === 'object' && 'code' in error) {
				if (error.code === 'SQLITE_BUSY') {
					logger.info('SQLITE busy, not able to run maintenance.');
					return 0;
				}
			}
			throw error;
		}
	}

	public hasJobFailedTooManyTimes(job: JobWithData): boolean {
		return job.retryCount >= this.options.retryCount;
	}

	public async stop() {
		if (this.maintenanceIntervalRef) {
			clearInterval(this.maintenanceIntervalRef);
		}
		return this.sqlite.destroy();
	}
}
