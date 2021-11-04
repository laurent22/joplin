import { clientType, DbConnection } from '../../db';
import { ContentDriverConfig, ContentDriverConfigType } from '../../utils/types';
import ContentDriverBase from './ContentDriverBase';
import ContentDriverDatabase from './ContentDriverDatabase';
import ContentDriverFs from './ContentDriverFs';
import ContentDriverMemory from './ContentDriverMemory';

export default function(config: ContentDriverConfig, db: DbConnection): ContentDriverBase | null {
	if (!config) return null;

	if (config.type === ContentDriverConfigType.Database) {
		return new ContentDriverDatabase({ dbClientType: clientType(db) });
	}

	if (config.type === ContentDriverConfigType.Filesystem) {
		return new ContentDriverFs({ basePath: config.path });
	}

	if (config.type === ContentDriverConfigType.Memory) {
		return new ContentDriverMemory();
	}

	throw new Error(`Invalid config: ${JSON.stringify(config)}`);
}
