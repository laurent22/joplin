import ApplicationJoplin from '../apps/joplin/Application';
import config from '../config';
import { Models } from '../models/factory';

export default class Applications {

	private joplin_: ApplicationJoplin = null;
	private models_: Models;

	public constructor(models: Models) {
		this.models_ = models;
	}

	public async joplin(): Promise<ApplicationJoplin> {
		if (!this.joplin_) {
			this.joplin_ = new ApplicationJoplin();
			this.joplin_.initBase_('joplin', config(), this.models_);
			await this.joplin_.initialize();
		}

		return this.joplin_;
	}

	public async localFileFromUrl(url: string): Promise<string> {
		if (url.indexOf('apps/') !== 0) return null;

		// The below is roughtly hard-coded for the Joplin app but could be
		// generalised if multiple apps are supported.

		const joplinApp = await this.joplin();

		const fromAppUrl = await joplinApp.localFileFromUrl(url);
		if (fromAppUrl) return fromAppUrl;

		const rootDir = joplinApp.rootDir;

		const defaultPaths = [
			'apps/joplin',
		];

		for (const p of defaultPaths) {
			if (url.indexOf(p) === 0) return `${rootDir}/${url.substr(p.length + 1)}`;
		}

		return null;
	}

}
