import Logger from '@joplin/lib/Logger';
import ChangeModel from '../models/ChangeModel';
import { Models } from '../models/factory';
import { Env } from '../utils/types';

const logger = Logger.create('ShareService');

export default class ShareService {

	private env_: Env;
	private models_: Models;
	private maintenanceScheduled_: boolean = false;
	private maintenanceInProgress_: boolean = false;
	private scheduleMaintenanceTimeout_: any = null;

	public constructor(env: Env, models: Models) {
		this.env_ = env;
		this.models_ = models;
		this.scheduleMaintenance = this.scheduleMaintenance.bind(this);
	}

	public async destroy() {
		if (this.scheduleMaintenanceTimeout_) {
			clearTimeout(this.scheduleMaintenanceTimeout_);
			this.scheduleMaintenanceTimeout_ = null;
		}
	}

	public get models(): Models {
		return this.models_;
	}

	public get env(): Env {
		return this.env_;
	}

	public get maintenanceInProgress(): boolean {
		return this.maintenanceInProgress_;
	}

	private async scheduleMaintenance() {
		if (this.maintenanceScheduled_) return;
		this.maintenanceScheduled_ = true;

		this.scheduleMaintenanceTimeout_ = setTimeout(() => {
			this.maintenanceScheduled_ = false;
			void this.maintenance();
		}, this.env === Env.Dev ? 2000 : 10000);
	}

	private async maintenance() {
		if (this.maintenanceInProgress_) return;

		logger.info('Starting maintenance...');
		const startTime = Date.now();

		this.maintenanceInProgress_ = true;
		try {
			await this.models.share().updateSharedItems3();
		} catch (error) {
			logger.error('Could not update share items:', error);
		}
		this.maintenanceInProgress_ = false;

		logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		ChangeModel.eventEmitter.on('saved', this.scheduleMaintenance);
		await this.maintenance();
	}

}
