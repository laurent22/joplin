import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN is_locked INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes ADD COLUMN extracted_resource_ids TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE revisions ADD COLUMN is_locked INT NOT NULL DEFAULT 0',
		'ALTER TABLE resources ADD COLUMN is_locked INT NOT NULL DEFAULT 0',
	];
};
