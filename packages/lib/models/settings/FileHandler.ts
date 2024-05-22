import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import Setting from '../Setting';

const logger = Logger.create('Settings');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type SettingValues = Record<string, any>;

export default class FileHandler {

	private filePath_: string;
	private valueJsonCache_: string = null;
	private parsedJsonCache_: SettingValues = null;

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
			this.parsedJsonCache_ = null;
		}

		if (this.parsedJsonCache_) return this.parsedJsonCache_;

		let result: SettingValues;
		try {
			const values = JSON.parse(this.valueJsonCache_);
			delete values['$id'];
			delete values['$schema'];
			result = values;
		} catch (error) {
			// Most likely the user entered invalid JSON - in this case we move
			// the broken file to a new name (otherwise it would be overwritten
			// by valid JSON and user will lose all their settings).
			logger.error(`Could not parse JSON file: ${this.filePath_}`, error);
			await shim.fsDriver().move(this.filePath_, `${this.filePath_}-${Date.now()}-invalid.bak`);
			result = {};
		}

		this.parsedJsonCache_ = result;

		return result;
	}

	public async save(values: SettingValues) {
		values = { ...values };

		// Merge with existing settings. This prevents settings stored by disabled or not-yet-loaded
		// plugins from being deleted.
		for (const key in this.parsedJsonCache_) {
			const includesSetting = Object.prototype.hasOwnProperty.call(values, key);
			if (!includesSetting) {
				values[key] = this.parsedJsonCache_[key];
			}
		}

		const json = `${JSON.stringify({
			'$schema': Setting.schemaUrl,
			...values,
		}, null, '\t')}\n`;

		if (json === this.valueJsonCache_) return;

		await shim.fsDriver().writeFile(this.filePath_, json, 'utf8');
		this.valueJsonCache_ = json;
	}

}
