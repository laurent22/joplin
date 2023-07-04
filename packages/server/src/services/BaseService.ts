import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import { msleep } from '../utils/time';
import { Config, Env } from '../utils/types';

const logger = Logger.create('BaseService');

export default class BaseService {

	private env_: Env;
	private models_: Models;
	private config_: Config;
	protected name_ = 'Untitled';
	protected enabled_ = true;
	private destroyed_ = false;
	protected maintenanceInterval_ = 10000;
	private scheduledMaintenances_: boolean[] = [];
	private maintenanceInProgress_ = false;

	public constructor(env: Env, models: Models, config: Config) {
		this.env_ = env;
		this.models_ = models;
		this.config_ = config;
		this.scheduleMaintenance = this.scheduleMaintenance.bind(this);
	}

	protected get name(): string {
		return this.name_;
	}

	public async destroy() {
		if (this.destroyed_) throw new Error(`${this.name}: Already destroyed`);
		this.destroyed_ = true;
		this.scheduledMaintenances_ = [];

		while (this.maintenanceInProgress_) {
			await msleep(500);
		}
	}

	protected get models(): Models {
		return this.models_;
	}

	protected get env(): Env {
		return this.env_;
	}

	protected get config(): Config {
		return this.config_;
	}

	public get enabled(): boolean {
		return this.enabled_;
	}

	public get maintenanceInProgress(): boolean {
		return !!this.scheduledMaintenances_.length;
	}

	protected async scheduleMaintenance() {
		if (this.destroyed_) return;

		// Every time a maintenance is scheduled we push a task to this array.
		// Whenever the maintenance actually runs, that array is cleared. So it
		// means, that if new tasks are pushed to the array while the
		// maintenance is runing, it will run again once it's finished, so as to
		// process any item that might have been added.

		this.scheduledMaintenances_.push(true);

		if (this.scheduledMaintenances_.length !== 1) return;

		while (this.scheduledMaintenances_.length) {
			await msleep(this.env === Env.Dev ? 2000 : this.maintenanceInterval_);
			if (this.destroyed_) return;
			const itemCount = this.scheduledMaintenances_.length;
			await this.runMaintenance();
			this.scheduledMaintenances_.splice(0, itemCount);
		}
	}

	public async runMaintenance() {
		if (this.maintenanceInProgress_) {
			logger.warn(`${this.name}: Skipping maintenance because it is already in progress`);
			return;
		}

		this.maintenanceInProgress_ = true;
		try {
			await this.maintenance();
		} catch (error) {
			logger.error(`${this.name}: Could not run maintenance`, error);
		}
		this.maintenanceInProgress_ = false;
	}

	protected async maintenance() {
		throw new Error('Not implemented');
	}

	public async runInBackground() {
		await this.runMaintenance();
	}

}
