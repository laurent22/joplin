import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN todo_due_recurrence TEXT NOT NULL DEFAULT \'\'',
	];
};
