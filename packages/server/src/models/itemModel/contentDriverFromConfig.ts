import { clientType, DbConnection } from '../../db';
import { ContentDriverConfig, ContentDriverType } from '../../utils/types';
import ContentDriverBase from './ContentDriverBase';
import ContentDriverDatabase from './ContentDriverDatabase';
import ContentDriverFs from './ContentDriverFs';
import ContentDriverMemory from './ContentDriverMemory';

export default function(config: ContentDriverConfig, db: DbConnection): ContentDriverBase | null {
	if (!config) return null;

	if (config.type === ContentDriverType.Database) {
		return new ContentDriverDatabase({ dbClientType: clientType(db) });
	}

	if (config.type === ContentDriverType.Filesystem) {
		return new ContentDriverFs({ basePath: config.path });
	}

	if (config.type === ContentDriverType.Memory) {
		return new ContentDriverMemory();
	}

	throw new Error(`Invalid config: ${JSON.stringify(config)}`);
}
