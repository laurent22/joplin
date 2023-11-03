import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `notes` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE `tags` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE `folders` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
		'ALTER TABLE `resources` ADD COLUMN `user_data` TEXT NOT NULL DEFAULT ""',
	];
};
