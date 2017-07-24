import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { _, supportedLocalesToLanguages, defaultLocale } from 'lib/locale.js';

class Setting extends BaseModel {

	static tableName() {
		return 'settings';
	}

	static modelType() {
		return BaseModel.TYPE_SETTING;
	}

	static settingMetadata(key) {
		if (!(key in this.metadata_)) throw new Error('Unknown key: ' + key);
		let output = Object.assign({}, this.metadata_[key]);
		output.key = key;
		return output;
	}

	static keys() {
		if (this.keys_) return this.keys_;
		this.keys_ = [];
		for (let n in this.metadata_) {
			if (!this.metadata_.hasOwnProperty(n)) continue;
			this.keys_.push(n);
		}
		return this.keys_;
	}

	static publicKeys() {
		let output = [];
		for (let n in this.metadata_) {
			if (!this.metadata_.hasOwnProperty(n)) continue;
			if (this.metadata_[n].public) output.push(n);
		}
		return output;
	}

	static load() {
		this.cancelScheduleUpdate();
		this.cache_ = [];
		return this.modelSelectAll('SELECT * FROM settings').then((rows) => {
			this.cache_ = rows;

			// TEMPORARY TO CONVERT ALL CLIENT SETTINGS
			for (let i = 0; i < this.cache_.length; i++) {
				if (this.cache_[i].key == 'sync.target' && this.cache_[i].value == 'onedrive') {
					this.cache_[i].value = 3;
				}
			}
		});
	}

	static setConstant(key, value) {
		if (!(key in this.constants_)) throw new Error('Unknown constant key: ' + key);
		this.constants_[key] = value;
	}

	static setValue(key, value) {
		if (!this.cache_) throw new Error('Settings have not been initialized!');
		
		for (let i = 0; i < this.cache_.length; i++) {
			let c = this.cache_[i];
			if (c.key == key) {
				const md = this.settingMetadata(key);

				if (md.type == 'enum') {
					if (!this.isAllowedEnumOption(key, value)) {
						throw new Error(_('Invalid option value: "%s". Possible values are: %s.', value, this.enumOptionsDoc(key)));
					}
				}

				if (c.value === value) return;
				c.value = value;
				this.scheduleUpdate();
				return;
			}
		}

		let s = this.settingMetadata(key);
		s.value = value;
		this.cache_.push(s);
		this.scheduleUpdate();
	}

	static value(key) {
		if (key in this.constants_) {
			let output = this.constants_[key];
			if (output == 'SET_ME') throw new Error('Setting constant has not been set: ' + key);
			return output;
		}

		if (!this.cache_) throw new Error('Settings have not been initialized!');

		for (let i = 0; i < this.cache_.length; i++) {
			if (this.cache_[i].key == key) {
				return this.cache_[i].value;
			}
		}

		let s = this.settingMetadata(key);
		return s.value;
	}

	static isEnum(key) {
		const md = this.settingMetadata(key);
		return md.type == 'enum';
	}

	static enumOptionValues(key) {
		const options = this.enumOptions(key);
		let output = [];
		for (let n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(n);
		}
		return output;
	}

	static enumOptionLabel(key, value) {
		const options = this.enumOptions(key);
		for (let n in options) {
			if (n == value) return options[n];
		}
		return '';
	}

	static enumOptions(key) {
		if (!this.metadata_[key]) throw new Error('Unknown key: ' + key);
		if (!this.metadata_[key].options) throw new Error('No options for: ' + key);
		return this.metadata_[key].options();
	}

	static enumOptionsDoc(key) {
		const options = this.enumOptions(key);
		let output = [];
		for (let n in options) {
			if (!options.hasOwnProperty(n)) continue;
			output.push(_('%s (%s)', n, options[n]));
		}
		return output.join(', ');
	}

	static isAllowedEnumOption(key, value) {
		const options = this.enumOptions(key);
		return !!options[value];
	}

	// Currently only supports objects with properties one level deep
	static object(key) {
		let output = {};
		let keys = this.keys();
		for (let i = 0; i < keys.length; i++) {
			let k = keys[i].split('.');
			if (k[0] == key) {
				output[k[1]] = this.value(keys[i]);
			}
		}
		return output;
	}

	// Currently only supports objects with properties one level deep
	static setObject(key, object) {
		for (let n in object) {
			if (!object.hasOwnProperty(n)) continue;
			this.setValue(key + '.' + n, object[n]);
		}
	}

	static saveAll() {
		if (!this.updateTimeoutId_) return Promise.resolve();

		this.logger().info('Saving settings...');
		clearTimeout(this.updateTimeoutId_);
		this.updateTimeoutId_ = null;

		let queries = [];
		queries.push('DELETE FROM settings');
		for (let i = 0; i < this.cache_.length; i++) {
			let s = Object.assign({}, this.cache_[i]);
			delete s.public;
			delete s.appTypes;
			delete s.label;
			delete s.options;
			queries.push(Database.insertQuery(this.tableName(), s));
		}

		return BaseModel.db().transactionExecBatch(queries).then(() => {
			this.logger().info('Settings have been saved.');
		});
	}

	static scheduleUpdate() {
		if (this.updateTimeoutId_) clearTimeout(this.updateTimeoutId_);

		this.updateTimeoutId_ = setTimeout(() => {
			this.saveAll();
		}, 500);
	}

	static cancelScheduleUpdate() {
		if (this.updateTimeoutId_) clearTimeout(this.updateTimeoutId_);
		this.updateTimeoutId_ = null;
	}

	static publicSettings(appType) {
		if (!appType) throw new Error('appType is required');

		let output = {};
		for (let key in Setting.metadata_) {
			if (!Setting.metadata_.hasOwnProperty(key)) continue;
			let s = Object.assign({}, Setting.metadata_[key]);
			if (!s.public) continue;
			if (s.appTypes && s.appTypes.indexOf(appType) < 0) continue;
			s.value = this.value(key);
			output[key] = s;
		}
		return output;
	}

}

Setting.SYNC_TARGET_MEMORY = 1;
Setting.SYNC_TARGET_FILESYSTEM = 2;
Setting.SYNC_TARGET_ONEDRIVE = 3;

Setting.metadata_ = {
	'activeFolderId': { value: '', type: 'string', public: false },
	'sync.2.path': { value: '', type: 'string', public: true, appTypes: ['cli'] },
	'sync.3.auth': { value: '', type: 'string', public: false },
	'sync.target': { value: Setting.SYNC_TARGET_ONEDRIVE, type: 'enum', public: true, label: () => _('Synchronisation target'), options: () => {
		let output = {};
		output[Setting.SYNC_TARGET_MEMORY] = 'Memory';
		output[Setting.SYNC_TARGET_FILESYSTEM] = _('File system');
		output[Setting.SYNC_TARGET_ONEDRIVE] = _('OneDrive');
		return output;
	}},
	'sync.context': { value: '', type: 'string', public: false },
	'editor': { value: '', type: 'string', public: true, appTypes: ['cli'] },
	'locale': { value: defaultLocale(), type: 'enum', public: true, label: () => _('Language'), options: () => {
		return supportedLocalesToLanguages();
	}},
	'todoFilter': { value: 'all', type: 'enum', public: true, appTypes: ['mobile'], label: () => _('Todo filter'), options: () => ({
		all: _('Show all'),
		recent: _('Non-completed and recently completed ones'),
		nonCompleted: _('Non-completed ones only'),
	})},
};

// Contains constants that are set by the application and
// cannot be modified by the user:
Setting.constants_ = {
	'env': 'SET_ME',
	'appName': 'joplin',
	'appId': 'SET_ME', // Each app should set this identifier
	'appType': 'SET_ME', // 'cli' or 'mobile'
	'resourceDir': '',
	'profileDir': '',
	'tempDir': '',
}

export { Setting };