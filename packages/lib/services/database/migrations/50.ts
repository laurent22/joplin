import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE notes ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE notes ADD COLUMN extracted_resource_ids TEXT DEFAULT NULL',
		'ALTER TABLE revisions ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
		'ALTER TABLE resources ADD COLUMN is_locally_encrypted INT NOT NULL DEFAULT 0',
	];
};
