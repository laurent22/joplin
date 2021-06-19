import BaseService from './BaseService';
const cron = require('node-cron');

export default class CronService extends BaseService {

	public async runInBackground() {
		cron.schedule('0 */6 * * *', async () => {
			await this.models.token().deleteExpiredTokens();
		});
	}

}
