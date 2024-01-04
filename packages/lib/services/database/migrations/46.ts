import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `notes` ADD COLUMN `deleted_time` INT NOT NULL DEFAULT 0',
		'ALTER TABLE `folders` ADD COLUMN `deleted_time` INT NOT NULL DEFAULT 0',
	];
};
