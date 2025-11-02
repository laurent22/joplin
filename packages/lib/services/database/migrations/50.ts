import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN sync_change_instance_id_ TEXT NOT NULL DEFAULT ""',
	];
};
