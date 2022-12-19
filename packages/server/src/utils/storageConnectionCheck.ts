import { DbConnection } from '../db';
import { Models } from '../models/factory';
import loadStorageDriver from '../models/items/storage/loadStorageDriver';
import parseStorageConnectionString from '../models/items/storage/parseStorageConnectionString';
import { Context } from '../models/items/storage/StorageDriverBase';
import { StorageDriverConfig, StorageDriverType } from './types';
import uuidgen from './uuidgen';

export default async function(connection: string | StorageDriverConfig, db: DbConnection, models: Models): Promise<string> {
	const storageConfig = typeof connection === 'string' ? parseStorageConnectionString(connection) : connection;

	if (storageConfig.type === StorageDriverType.Database) return 'Database storage is special and cannot be checked this way. If the connection to the database was successful then the storage driver should work too.';

	const driver = await loadStorageDriver(storageConfig, db, { assignDriverId: false });
	const itemId = `testingconnection${uuidgen(8)}`;
	const itemContent = Buffer.from(uuidgen(8));
	const context: Context = { models };

	try {
		await driver.write(itemId, itemContent, context);
	} catch (error) {
		error.message = `Could not write content to storage: ${error.message}`;
		throw error;
	}

	if (!(await driver.exists(itemId, context))) {
		throw new Error(`Written item does not exist: ${itemId}`);
	}

	const readContent = await driver.read(itemId, context);
	if (readContent.toString() !== itemContent.toString()) throw new Error(`Could not read back written item. Expected: ${itemContent.toString()}. Got: ${readContent.toString()}`);

	await driver.delete(itemId, context);

	if (await driver.exists(itemId, context)) {
		throw new Error(`Deleted item still exist: ${itemId}`);
	}

	return 'Item was written, read back and deleted without any error.';
}
