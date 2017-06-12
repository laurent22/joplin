import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';
import { Database } from 'src/database.js';

class Setting extends BaseModel {

	static tableName() {
		return 'settings';
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

	static load() {
		this.cache_ = [];
		return this.db().selectAll('SELECT * FROM settings').then((rows) => {
			this.cache_ = rows;
		});
	}

	static setValue(key, value) {
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

		Log.info('Saving settings...');
		clearTimeout(this.updateTimeoutId_);
		this.updateTimeoutId_ = null;

		let queries = [];
		queries.push('DELETE FROM settings');
		for (let i = 0; i < this.cache_.length; i++) {
			queries.push(Database.insertQuery(this.tableName(), this.cache_[i]));			
		}

		return BaseModel.db().transactionExecBatch(queries).then(() => {
			Log.info('Settings have been saved.');
		}).catch((error) => {
			Log.warn('Could not save settings', error);
			reject(error);
		});
	}

	static scheduleUpdate() {
		if (this.updateTimeoutId_) clearTimeout(this.updateTimeoutId_);

		this.updateTimeoutId_ = setTimeout(() => {
			this.saveAll();
		}, 500);
	}

}

Setting.defaults_ = {
	'clientId': { value: '', type: 'string' },
	'sessionId': { value: '', type: 'string' },
	'user.email': { value: '', type: 'string' },
	'user.session': { value: '', type: 'string' },
	'sync.lastRevId': { value: 0, type: 'int' }, // DEPRECATED
	'sync.lastUpdateTime': { value: 0, type: 'int' },
};

export { Setting };