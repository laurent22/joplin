import Logger from '@joplin/lib/Logger';
import ChangeModel from '../models/ChangeModel';
import { Models } from '../models/factory';

const logger = Logger.create('ShareService');

export default class ShareService {

	private models_: Models;
	private maintenanceScheduled_: boolean = false;
	private maintenanceInProgress_: boolean = false;

	public constructor(models: Models) {
		this.models_ = models;
		this.scheduleMaintenance = this.scheduleMaintenance.bind(this);
	}

	public get models(): Models {
		return this.models_;
	}

	public get maintenanceInProgress(): boolean {
		return this.maintenanceInProgress_;
	}

	private async scheduleMaintenance() {
		if (this.maintenanceScheduled_) return;
		this.maintenanceScheduled_ = true;

		setTimeout(() => {
			this.maintenanceScheduled_ = false;
			void this.maintenance();
		}, 10000);
	}

	private async maintenance() {
		if (this.maintenanceInProgress_) return;

		logger.info('Starting maintenance...');
		const startTime = Date.now();

		this.maintenanceInProgress_ = true;
		await this.models.share().updateSharedItems();
		this.maintenanceInProgress_ = false;

		logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		ChangeModel.eventEmitter.on('saved', this.scheduleMaintenance);
		await this.maintenance();
	}

}
