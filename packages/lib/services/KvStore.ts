import BaseService from './BaseService';
const Mutex = require('async-mutex').Mutex;

enum ValueType {
	Int = 1,
	Text = 2,
}

export default class KvStore extends BaseService {

	private incMutex_: any = null;
	private db_: any = null;

	private static instance_: KvStore = null;

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new KvStore();
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_ = null;
	}

	public constructor() {
		super();
		this.incMutex_ = new Mutex();
	}

	public setDb(v: any) {
		this.db_ = v;
	}

	private db() {
		if (!this.db_) throw new Error('Accessing DB before it has been set!');
		return this.db_;
	}

	private typeFromValue_(value: any) {
		if (typeof value === 'string') return ValueType.Text;
		if (typeof value === 'number') return ValueType.Int;
		throw new Error(`Unsupported value type: ${typeof value}`);
	}

	private formatValues_(kvs: any[]) {
		const output = [];
		for (const kv of kvs) {
			kv.value = this.formatValue_(kv.value, kv.type);
			output.push(kv);
		}
		return output;
	}

	private formatValue_(value: any, type: ValueType): string | number {
		if (type === ValueType.Int) return Number(value);
		if (type === ValueType.Text) return `${value}`;
		throw new Error(`Unknown type: ${type}`);
	}

	public async value<T>(key: string): Promise<T> {
		const r = await this.db().selectOne('SELECT `value`, `type` FROM key_values WHERE `key` = ?', [key]);
		if (!r) return null;
		return this.formatValue_(r.value, r.type) as any;
	}

	public async setValue(key: string, value: any) {
		const t = Date.now();
		await this.db().exec('INSERT OR REPLACE INTO key_values (`key`, `value`, `type`, `updated_time`) VALUES (?, ?, ?, ?)', [key, value, this.typeFromValue_(value), t]);
	}

	public async deleteValue(key: string) {
		await this.db().exec('DELETE FROM key_values WHERE `key` = ?', [key]);
	}

	public async deleteByPrefix(prefix: string) {
		await this.db().exec('DELETE FROM key_values WHERE `key` LIKE ?', [`${prefix}%`]);
	}

	public async clear() {
		await this.db().exec('DELETE FROM key_values');
	}

	public async all() {
		return this.formatValues_(await this.db().selectAll('SELECT * FROM key_values'));
	}

	// Note: atomicity is done at application level so two difference instances
	// accessing the db at the same time could mess up the increment.
	public async incValue(key: string, inc = 1) {
		const release = await this.incMutex_.acquire();

		try {
			const result = await this.db().selectOne('SELECT `value`, `type` FROM key_values WHERE `key` = ?', [key]);
			const newValue = result ? (this.formatValue_(result.value, result.type) as ValueType.Int) + inc : inc;
			await this.setValue(key, newValue);
			release();
			return newValue;
		} catch (error) {
			release();
			throw error;
		}
	}

	public async searchByPrefix(prefix: string) {
		const results = await this.db().selectAll('SELECT `key`, `value`, `type` FROM key_values WHERE `key` LIKE ?', [`${prefix}%`]);
		return this.formatValues_(results);
	}

	public async countKeys() {
		const r = await this.db().selectOne('SELECT count(*) as total FROM key_values');
		return r.total ? r.total : 0;
	}
}
