import { KeyValue } from '../services/database/types';
import BaseModel from './BaseModel';

export enum ValueType {
	Integer = 1,
	String = 2,
}

type Value = number | string;

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

	public async deleteValue(key: string): Promise<void> {
		await this.db(this.tableName).where('key', '=', key).delete();
	}

	public async delete(_id: string | string[] | number | number[], _options: any = {}): Promise<void> {
		throw new Error('Call ::deleteValue()');
	}

}
