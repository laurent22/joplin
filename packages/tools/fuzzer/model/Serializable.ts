import { hasOwnProperty } from '@joplin/utils/object';
import { ItemId } from './types';

type StringTypePrimitive = 'string'|'boolean'|'number'|'unknown'|'id';
type StringType = StringTypePrimitive|`${StringTypePrimitive}[]`;
export type BaseSchema =
	StringType
	| [BaseSchema, '...']
	| [BaseSchema, BaseSchema]
	| { [key: string]: BaseSchema };

type TypeMap = {
	'string': string;
	'boolean': boolean;
	'number': number;
	'id': ItemId;
	'unknown': unknown;
	'string[]': string[];
	'boolean[]': boolean[];
	'number[]': number[];
	'id[]': ItemId[];
	'unknown[]': unknown[];
};

export type SchemaToType<Schema extends BaseSchema|StringType> = (
	Schema extends StringType
		? TypeMap[Schema]
		: {
			[key in keyof Schema]:
			Schema[key] extends [BaseSchema, '...']
				? SchemaToType<Schema[key][0]>[]
				: Schema[key] extends [BaseSchema, BaseSchema]
					? [ SchemaToType<Schema[key][0]>, SchemaToType<Schema[key][1]> ]
					: Schema[key] extends BaseSchema
						? SchemaToType<Schema[key]>
						: never
		}
	);

const deserializeFromSchema = <Schema extends BaseSchema|StringType> (schema: Schema, data: unknown): SchemaToType<Schema> => {
	const errorContext = () => `(deserializing ${JSON.stringify(data)})`;

	let result;
	if (typeof schema === 'string') {
		if (schema === 'id') {
			if (typeof data !== 'string') {
				throw new Error(`IDs must be strings. ${errorContext()}`);
			}
			if (data !== '' && !/^[a-z0-9]{32}$/i.exec(data)) {
				throw new Error(`IDs must be 32 character alphanumeric strings or empty. ${errorContext()}`);
			}

			result = data;
		} else if (schema === 'unknown') {
			// No check required
			result = data;
		} else if (schema.endsWith('[]')) {
			if (!Array.isArray(data)) {
				throw new Error(`Invalid type ${typeof data}, expected array. ${errorContext()}`);
			}

			const subSchema = schema.substring(0, schema.length - 2) as StringType;

			const resultArray = [];
			for (const item of data) {
				resultArray.push(deserializeFromSchema(subSchema, item));
			}
			result = resultArray;
		} else if (typeof data !== schema) {
			throw new Error(`Invalid type: ${typeof data}. Expected ${schema} ${errorContext()}`);
		} else {
			result = data;
		}
	} else if (Array.isArray(schema)) {
		if (!Array.isArray(data)) {
			throw new Error(`Invalid type: ${typeof data}. Expected array. ${errorContext()}`);
		}

		if (schema.length !== 2) {
			throw new Error(`Invalid schema: ${JSON.stringify(schema)}. Expected an array of length 2.`);
		}

		if (schema[1] === '...') {
			const itemSchema = schema[0];

			const resultArray = [];
			for (let i = 0; i < data.length; i++) {
				// Cast to 'unknown' to avoid "type instantiation is excessively deep" errors
				resultArray.push(deserializeFromSchema(itemSchema as 'unknown', data[i]));
			}
			result = resultArray;
		} else {
			result = [
				// Cast to 'unknown' to avoid "type instantiation is excessively deep" errors
				deserializeFromSchema(schema[0] as 'unknown', data[0]),
				deserializeFromSchema(schema[1] as 'unknown', data[1]),
			];
		}
	} else {
		if (typeof data !== 'object') {
			throw new Error(`Cannot deserialize non-object ${errorContext()}`);
		}

		result = Object.create(null);
		for (const [key, subSchema] of Object.entries(schema)) {
			if (!hasOwnProperty(data, key)) {
				throw new Error(`Cannot deserialize: Missing property ${JSON.stringify(key)} ${errorContext()}`);
			}

			result[key] = deserializeFromSchema(subSchema as 'unknown', data[key]);
		}
	}
	return result;
};

export default abstract class Serializable<Schema extends BaseSchema> {
	// Note: At present, schema **must** use the js-private variable
	// syntax to prevent it from being listed as a property on the subclass.
	#schema: Schema;

	protected constructor(schema: Schema) {
		this.#schema = schema;
	}

	public abstract serialize(): Readonly<SchemaToType<Schema>>;

	protected static deserialize = deserializeFromSchema;
	protected deserialize(data: unknown): SchemaToType<Schema> {
		return deserializeFromSchema(this.#schema, data);
	}
}
