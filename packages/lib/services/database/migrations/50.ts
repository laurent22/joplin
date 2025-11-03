import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN sync_operation_id_ TEXT NOT NULL DEFAULT ""',
	];
};
