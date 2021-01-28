import { Models } from '../models/factory';
import { Config } from '../utils/types';
import MustacheService from './MustacheService';

export default class BaseApplication {

	private config_: Config = null;
	private models_: Models = null;
	private mustache_: MustacheService = null;

	protected get mustache(): MustacheService {
		return this.mustache_;
	}

	protected get config(): Config {
		return this.config_;
	}

	protected get models(): Models {
		return this.models_;
	}

	public initBase_(appName: string, config: Config, models: Models) {
		const appRootDir = `${config.rootDir}/src/apps/${appName}`;
		this.config_ = config;
		this.models_ = models;
		this.mustache_ = new MustacheService(`${appRootDir}/views`, `${config.baseUrl}/apps/${appName}`);
	}

}
