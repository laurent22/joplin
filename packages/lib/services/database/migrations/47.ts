import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN sync_warning_dismissed INT NOT NULL DEFAULT "0"',
	];
};
