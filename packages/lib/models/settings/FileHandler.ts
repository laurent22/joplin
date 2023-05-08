import Logger from '../../Logger';
import shim from '../../shim';
import { schemaUrl } from './types';

const logger = Logger.create('Settings');

export type SettingValues = Record<string, any>;

export default class FileHandler {

	private filePath_: string;
	private valueJsonCache_: string = null;

	public constructor(filePath: string) {
		this.filePath_ = filePath;
	}

	public async load(): Promise<SettingValues> {
		if (!this.valueJsonCache_) {
			if (!(await shim.fsDriver().exists(this.filePath_))) {
				this.valueJsonCache_ = '{}';
			} else {
				this.valueJsonCache_ = await shim.fsDriver().readFile(this.filePath_, 'utf8');
			}
		}

		try {
			const values = JSON.parse(this.valueJsonCache_);
			delete values['$id'];
			delete values['$schema'];
			return values;
		} catch (error) {
			// Most likely the user entered invalid JSON - in this case we move
			// the broken file to a new name (otherwise it would be overwritten
			// by valid JSON and user will lose all their settings).
			logger.error(`Could not parse JSON file: ${this.filePath_}`, error);
			await shim.fsDriver().move(this.filePath_, `${this.filePath_}-${Date.now()}-invalid.bak`);
			return {};
		}
	}

	public async save(values: SettingValues) {
		const json = `${JSON.stringify({
			'$schema': schemaUrl,
			...values,
		}, null, '\t')}\n`;

		if (json === this.valueJsonCache_) return;

		await shim.fsDriver().writeFile(this.filePath_, json, 'utf8');
		this.valueJsonCache_ = json;
	}

}
