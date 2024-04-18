import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `resources` ADD COLUMN blob_updated_time INT NOT NULL DEFAULT 0',
		'UPDATE `resources` SET blob_updated_time = updated_time',
	];
};
