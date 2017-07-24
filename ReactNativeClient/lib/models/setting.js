import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { _ } from 'lib/locale.js';

class Setting extends BaseModel {

	static tableName() {
		return 'settings';
	}

	static modelType() {
		return BaseModel.TYPE_SETTING;
	}

	static defaultSetting(key) {
		if (!(key in this.defaults_)) throw new Error('Unknown key: ' + key);
		let output = Object.assign({}, this.defaults_[key]);
		output.key = key;
		return output;
	}

	static keys() {
		if (this.keys_) return this.keys_;
		this.keys_ = [];
		for (let n in this.defaults_) {
			if (!this.defaults_.hasOwnProperty(n)) continue;
			this.keys_.push(n);
		}
		return this.keys_;
	}

	static publicKeys() {
		let output = [];
		for (let n in this.defaults_) {
			if (!this.defaults_.hasOwnProperty(n)) continue;
			if (this.defaults_[n].public) output.push(n);
		}
		return output;
	}

	static load() {
		this.cancelScheduleUpdate();
		this.cache_ = [];
		return this.modelSelectAll('SELECT * FROM settings').then((rows) => {
			this.cache_ = rows;
		});
	}

	static setConstant(key, value) {
		if (!(key in this.constants_)) throw new Error('Unknown constant key: ' + key);
		this.constants_[key] = value;
	}

	static setValue(key, value) {
		if (!this.cache_) throw new Error('Settings have not been initialized!');
		
		for (let i = 0; i < this.cache_.length; i++) {
			if (this.cache_[i].key == key) {
				if (this.cache_[i].value === value) return;
				this.cache_[i].value = value;
				this.scheduleUpdate();
				return;
			}
		}

		let s = this.defaultSetting(key);
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

		let s = this.defaultSetting(key);
		return s.value;
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
		for (let key in Setting.defaults_) {
			if (!Setting.defaults_.hasOwnProperty(key)) continue;
			let s = Object.assign({}, Setting.defaults_[key]);
			if (!s.public) continue;
			if (s.appTypes && s.appTypes.indexOf(appType) < 0) continue;
			s.value = this.value(key);
			output[key] = s;
		}
		return output;
	}

}

Setting.defaults_ = {
	'activeFolderId': { value: '', type: 'string', public: false },
	'sync.onedrive.auth': { value: '', type: 'string', public: false },
	'sync.filesystem.path': { value: '', type: 'string', public: true, appTypes: ['cli'] },
	'sync.target': { value: 'onedrive', type: 'enum', public: true, label: () => _('Synchronisation target'), options: () => ({
		1: 'Memory',
		2: _('File system'),
		3: _('OneDrive'),
	})},
	'sync.context': { value: '', type: 'string', public: false },
	'editor': { value: '', type: 'string', public: true, appTypes: ['cli'] },
	'locale': { value: 'en_GB', type: 'string', public: true },
	//'aliases': { value: '', type: 'string', public: true },
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