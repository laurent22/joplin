import globalConfig from '../../../config';
import { clientType, DbConnection } from '../../../db';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import newModelFactory from '../../factory';
import parseStorageDriverConnectionString from './parseStorageConnectionString';
import serializeStorageConfig from './serializeStorageConfig';
import StorageDriverBase from './StorageDriverBase';
import StorageDriverDatabase from './StorageDriverDatabase';
import StorageDriverFs from './StorageDriverFs';
import StorageDriverMemory from './StorageDriverMemory';
import StorageDriverS3 from './StorageDriverS3';

export interface Options {
	assignDriverId?: boolean;
}

export default async function(config: StorageDriverConfig | number, db: DbConnection, options: Options = null): Promise<StorageDriverBase | null> {
	if (!config) return null;

	options = {
		assignDriverId: true,
		...options,
	};

	let storageId = 0;

	if (typeof config === 'number') {
		storageId = config;

		const models = newModelFactory(db, globalConfig());
		const storage = await models.storage().byId(storageId);
		if (!storage) throw new Error(`No such storage ID: ${storageId}`);

		config = parseStorageDriverConnectionString(storage.connection_string);
	} else {
		if (options.assignDriverId) {
			const models = newModelFactory(db, globalConfig());

			const connectionString = serializeStorageConfig(config);
			let storage = await models.storage().byConnectionString(connectionString);

			if (!storage) {
				await models.storage().save({
					connection_string: connectionString,
				});
				storage = await models.storage().byConnectionString(connectionString);
			}

			storageId = storage.id;
		}
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

	if (config.type === StorageDriverType.S3) {
		return new StorageDriverS3(storageId, config);
	}

	throw new Error(`Invalid config type: ${JSON.stringify(config)}`);
}
