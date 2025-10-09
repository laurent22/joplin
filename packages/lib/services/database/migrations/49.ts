import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN remote_item_updated_time INT NOT NULL DEFAULT 0',
	];
};
