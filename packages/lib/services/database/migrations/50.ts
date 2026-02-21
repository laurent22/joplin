import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN alarm_recurrence TEXT NOT NULL DEFAULT ""',
	];
};
