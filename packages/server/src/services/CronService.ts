import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import { Config, Env } from '../utils/types';
import BaseService from './BaseService';
import TaskService from './TaskService';
const cron = require('node-cron');

const logger = Logger.create('cron');

export default class CronService extends BaseService {

	private taskService_: TaskService;

	public constructor(env: Env, models: Models, config: Config, taskService: TaskService) {
		super(env, models, config);
		this.taskService_ = taskService;
	}

	private async runTask(id: string) {
		logger.info(`Run: "${id}"...`);
		await this.taskService_.runTask(id);
		logger.info(`Done: "${id}"`);
	}

	public async runInBackground() {
		cron.schedule('0 */6 * * *', async () => {
			await this.runTask('deleteExpiredTokens');
		});

		cron.schedule('0 * * * *', async () => {
			await this.runTask('updateTotalSizes');
		});

		cron.schedule('0 12 * * *', async () => {
			await this.runTask('handleBetaUserEmails');
		});

		cron.schedule('0 13 * * *', async () => {
			await this.runTask('handleFailedPaymentSubscriptions');
		});

		cron.schedule('0 14 * * *', async () => {
			await this.runTask('handleOversizedAccounts');
		});
	}

}
