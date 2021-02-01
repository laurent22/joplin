import { Models } from '../models/factory';
import { Config } from '../utils/types';
import MustacheService from './MustacheService';

export default class BaseApplication {

	private appName_: string;
	private config_: Config = null;
	private models_: Models = null;
	private mustache_: MustacheService = null;
	private rootDir_: string;

	protected get mustache(): MustacheService {
		return this.mustache_;
	}

	protected get config(): Config {
		return this.config_;
	}

	protected get models(): Models {
		return this.models_;
	}

	public get rootDir(): string {
		return this.rootDir_;
	}

	public get appBaseUrl(): string {
		return `${this.config.baseUrl}/apps/${this.appName_}`;
	}

	public initBase_(appName: string, config: Config, models: Models) {
		this.appName_ = appName;
		this.rootDir_ = `${config.rootDir}/src/apps/${appName}`;
		this.config_ = config;
		this.models_ = models;
		this.mustache_ = new MustacheService(`${this.rootDir}/views`, `${config.baseUrl}/apps/${appName}`);
	}

	public async localFileFromUrl(_url: string): Promise<string> {
		return null;
	}

}
