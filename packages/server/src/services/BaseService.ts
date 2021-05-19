import { Models } from '../models/factory';
import { Config, Env } from '../utils/types';

export default class BaseService {

	private env_: Env;
	private models_: Models;
	private config_:Config;
	private maintenanceScheduled_: boolean = false;
	private maintenanceInProgress_: boolean = false;
	private scheduleMaintenanceTimeout_: any = null;
	protected enabled_:boolean = true;
	protected maintenanceInterval_:number = 10000;

	public constructor(env: Env, models: Models, config:Config) {
		this.env_ = env;
		this.models_ = models;
		this.config_ = config;
		this.scheduleMaintenance = this.scheduleMaintenance.bind(this);
	}

	public async destroy() {
		if (this.scheduleMaintenanceTimeout_) {
			clearTimeout(this.scheduleMaintenanceTimeout_);
			this.scheduleMaintenanceTimeout_ = null;
		}
	}

	protected get models(): Models {
		return this.models_;
	}

	protected get env(): Env {
		return this.env_;
	}

	protected get config():Config {
		return this.config_;
	}

	public get enabled():boolean {
		return this.enabled_;
	}

	public get maintenanceInProgress(): boolean {
		return this.maintenanceInProgress_;
	}

	protected async scheduleMaintenance() {
		if (!this.enabled) return;
		if (this.maintenanceScheduled_) return;
		this.maintenanceScheduled_ = true;

		this.scheduleMaintenanceTimeout_ = setTimeout(() => {
			this.maintenanceScheduled_ = false;
			void this.runMaintenance();
		}, this.env === Env.Dev ? 2000 : this.maintenanceInterval_);
	}

	private async runMaintenance() {
		if (!this.enabled) return;
		if (this.maintenanceInProgress_) return;

		this.maintenanceInProgress_ = true;
		await this.maintenance();
		this.maintenanceInProgress_ = false;
	}

	protected async maintenance() {
		throw new Error('Not implemented');
	}

	public async runInBackground() {
		await this.runMaintenance();
	}

}
