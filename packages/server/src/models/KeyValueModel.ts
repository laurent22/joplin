import { returningSupported } from '../db';
import { KeyValue } from '../services/database/types';
import { msleep } from '../utils/time';
import BaseModel from './BaseModel';

export enum ValueType {
	Integer = 1,
	String = 2,
}

export type Value = number | string;

export type ReadThenWriteHandler = (value: Value)=> Promise<Value>;

export default class KeyValueModel extends BaseModel<KeyValue> {

	protected get tableName(): string {
		return 'key_values';
	}

	protected hasUuid(): boolean {
		return false;
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	private valueType(value: Value): ValueType {
		if (typeof value === 'number') return ValueType.Integer;
		if (typeof value === 'string') return ValueType.String;
		throw new Error(`Unsupported value type: ${typeof value}`);
	}

	private serializeValue(value: Value): string {
		return value.toString();
	}

	private unserializeValue(type: ValueType, value: string): Value {
		if (type === ValueType.Integer) return Number(value);
		if (type === ValueType.String) return `${value}`;
		throw new Error(`Unsupported type: ${type}`);
	}

	public async setValue(key: string, value: Value): Promise<void> {
		const type = this.valueType(value);

		await this.withTransaction(async () => {
			await this.db(this.tableName).where('key', '=', key).delete();
			await this.db(this.tableName).insert({
				key,
				value: this.serializeValue(value),
				type,
			});
		}, 'KeyValueModel::setValue');
	}

	public async value<T>(key: string, defaultValue: Value = null): Promise<T> {
		const row: KeyValue = await this.db(this.tableName).where('key', '=', key).first();
		if (!row) return defaultValue as any;
		return this.unserializeValue(row.type, row.value) as any;
	}

	public async readThenWrite(key: string, handler: ReadThenWriteHandler) {
		if (!returningSupported(this.db)) {
			// While inside a transaction SQlite should lock the whole database
			// file, which should allow atomic read then write.
			await this.withTransaction(async () => {
				const value: any = await this.value(key);
				const newValue = await handler(value);
				await this.setValue(key, newValue);
			}, 'KeyValueModel::readThenWrite');
			return;
		}

		let loopCount = 0;
		while (true) {
			const row: KeyValue = await this.db(this.tableName).where('key', '=', key).first();
			const newValue = await handler(row ? row.value : null);

			let previousValue: Value = null;
			if (row) {
				previousValue = row.value;
			} else {
				await this.setValue(key, newValue);
				previousValue = newValue;
			}

			const updatedRows = await this
				.db(this.tableName)
				.update({ value: newValue }, ['id'])
				.where('key', '=', key)
				.where('value', '=', previousValue);

			if (updatedRows.length) return;

			loopCount++;
			if (loopCount >= 10) throw new Error(`Could not update key: ${key}`);
			await msleep(10000 * Math.random());
		}
	}

	public async deleteValue(key: string): Promise<void> {
		await this.db(this.tableName).where('key', '=', key).delete();
	}

	public async delete(_id: string | string[] | number | number[], _options: any = {}): Promise<void> {
		throw new Error('Call ::deleteValue()');
	}

	public async deleteAll(): Promise<void> {
		await this.db(this.tableName).delete();
	}

}
