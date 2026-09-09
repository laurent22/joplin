import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => [
	'ALTER TABLE revisions ADD COLUMN item_original_updated_time INT NOT NULL DEFAULT 0',
];
