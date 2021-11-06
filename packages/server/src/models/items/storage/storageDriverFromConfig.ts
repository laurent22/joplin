import globalConfig from '../../../config';
import { clientType, DbConnection } from '../../../db';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import newModelFactory from '../../factory';
import serializeStorageConfig from './serializeStorageConfig';
import StorageDriverBase from './StorageDriverBase';
import StorageDriverDatabase from './StorageDriverDatabase';
import StorageDriverFs from './StorageDriverFs';
import StorageDriverMemory from './StorageDriverMemory';

export default async function(config: StorageDriverConfig, db: DbConnection): Promise<StorageDriverBase | null> {
	if (!config) return null;

	const models = newModelFactory(db, globalConfig(), { storageDriver: null });

	const connectionString = serializeStorageConfig(config);
	const existingStorage = await models.storage().byConnectionString(connectionString);
	let storageId: number = null;

	if (existingStorage) {
		storageId = existingStorage.id;
	} else {
		const storage = await models.storage().save({
			connection_string: connectionString,
		});
		storageId = storage.id;
	}

	if (config.type === StorageDriverType.Database) {
		return new StorageDriverDatabase(storageId, { ...config, dbClientType: clientType(db) });
	}

	if (config.type === StorageDriverType.Filesystem) {
		return new StorageDriverFs(storageId, config);
	}

	if (config.type === StorageDriverType.Memory) {
		return new StorageDriverMemory(storageId, config);
	}

	throw new Error(`Invalid config: ${JSON.stringify(config)}`);
}
