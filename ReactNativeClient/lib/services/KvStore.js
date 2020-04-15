const BaseService = require('lib/services/BaseService.js');
const Mutex = require('async-mutex').Mutex;

class KvStore extends BaseService {
	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new KvStore();
		return this.instance_;
	}

	constructor() {
		super();
		this.incMutex_ = new Mutex();
	}

	setDb(v) {
		this.db_ = v;
	}

	db() {
		if (!this.db_) throw new Error('Accessing DB before it has been set!');
		return this.db_;
	}

	typeFromValue_(value) {
		if (typeof value === 'string') return KvStore.TYPE_TEXT;
		if (typeof value === 'number') return KvStore.TYPE_INT;
		throw new Error(`Unsupported value type: ${typeof value}`);
	}

	formatValues_(kvs) {
		const output = [];
		for (const kv of kvs) {
			kv.value = this.formatValue_(kv.value, kv.type);
			output.push(kv);
		}
		return output;
	}

	formatValue_(value, type) {
		if (type === KvStore.TYPE_INT) return Number(value);
		if (type === KvStore.TYPE_TEXT) return `${value}`;
		throw new Error(`Unknown type: ${type}`);
	}

	async value(key) {
		const r = await this.db().selectOne('SELECT `value`, `type` FROM key_values WHERE `key` = ?', [key]);
		if (!r) return null;
		return this.formatValue_(r.value, r.type);
	}

	async setValue(key, value) {
		const t = Date.now();
		await this.db().exec('INSERT OR REPLACE INTO key_values (`key`, `value`, `type`, `updated_time`) VALUES (?, ?, ?, ?)', [key, value, this.typeFromValue_(value), t]);
	}

	async deleteValue(key) {
		await this.db().exec('DELETE FROM key_values WHERE `key` = ?', [key]);
	}

	async deleteByPrefix(prefix) {
		await this.db().exec('DELETE FROM key_values WHERE `key` LIKE ?', [`${prefix}%`]);
	}

	async clear() {
		await this.db().exec('DELETE FROM key_values');
	}

	async all() {
		return this.formatValues_(await this.db().selectAll('SELECT * FROM key_values'));
	}

	// Note: atomicity is done at application level so two difference instances
	// accessing the db at the same time could mess up the increment.
	async incValue(key, inc = 1) {
		const release = await this.incMutex_.acquire();

		try {
			const result = await this.db().selectOne('SELECT `value`, `type` FROM key_values WHERE `key` = ?', [key]);
			const newValue = result ? this.formatValue_(result.value, result.type) + inc : inc;
			await this.setValue(key, newValue);
			release();
			return newValue;
		} catch (error) {
			release();
			throw error;
		}
	}

	async searchByPrefix(prefix) {
		const results = await this.db().selectAll('SELECT `key`, `value`, `type` FROM key_values WHERE `key` LIKE ?', [`${prefix}%`]);
		return this.formatValues_(results);
	}

	async countKeys() {
		const r = await this.db().selectOne('SELECT count(*) as total FROM key_values');
		return r.total ? r.total : 0;
	}
}

KvStore.TYPE_INT = 1;
KvStore.TYPE_TEXT = 2;

module.exports = KvStore;
