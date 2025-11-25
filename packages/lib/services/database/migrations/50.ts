import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'CREATE INDEX revisions_cleaning_composite ON revisions (item_type, item_id, item_updated_time)',
	];
};
