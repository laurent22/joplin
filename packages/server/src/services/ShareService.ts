import Logger from '@joplin/lib/Logger';
import ChangeModel from '../models/ChangeModel';
import BaseService from './BaseService';

const logger = Logger.create('ShareService');

export default class ShareService extends BaseService {

	protected async maintenance() {
		logger.info('Starting maintenance...');
		const startTime = Date.now();

		try {
			await this.models.share().updateSharedItems3();
		} catch (error) {
			logger.error('Could not update share items:', error);
		}

		logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		ChangeModel.eventEmitter.on('saved', this.scheduleMaintenance);
		await super.runInBackground();
	}

}
