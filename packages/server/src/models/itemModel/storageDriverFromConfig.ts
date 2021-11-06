import { clientType, DbConnection } from '../../db';
import { StorageDriverConfig, StorageDriverType } from '../../utils/types';
import StorageDriverBase from './StorageDriverBase';
import StorageDatabase from './StorageDriverDatabase';
import StorageDriverFs from './StorageDriverFs';
import StorageDriverMemory from './StorageDriverMemory';

export default function(config: StorageDriverConfig, db: DbConnection): StorageDriverBase | null {
	if (!config) return null;

	if (config.type === StorageDriverType.Database) {
		return new StorageDatabase({ dbClientType: clientType(db) });
	}

	if (config.type === StorageDriverType.Filesystem) {
		return new StorageDriverFs({ basePath: config.path });
	}

	if (config.type === StorageDriverType.Memory) {
		return new StorageDriverMemory();
	}

	throw new Error(`Invalid config: ${JSON.stringify(config)}`);
}
