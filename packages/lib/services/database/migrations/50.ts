import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN alarm_interval INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes_normalized ADD COLUMN alarm_interval INT NOT NULL DEFAULT 0',
	];
};
