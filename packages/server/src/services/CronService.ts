import Logger from '@joplin/lib/Logger';
import BaseService from './BaseService';
const cron = require('node-cron');

const logger = Logger.create('cron');

export default class CronService extends BaseService {

	public async runInBackground() {
		await this.models.item().updateTotalSizes();

		cron.schedule('0 */6 * * *', async () => {
			const startTime = Date.now();
			logger.info('Deleting expired tokens...');
			await this.models.token().deleteExpiredTokens();
			logger.info(`Expired tokens deleted in ${Date.now() - startTime}ms`);
		});

		cron.schedule('0 * * * *', async () => {
			const startTime = Date.now();
			logger.info('Updating total sizes...');
			await this.models.item().updateTotalSizes();
			logger.info(`Total sizes updated in ${Date.now() - startTime}ms`);
		});
	}

}
