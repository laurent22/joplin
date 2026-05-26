import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `folders` ADD COLUMN `order` NUMERIC NOT NULL DEFAULT 0',
		'CREATE INDEX folders_order ON folders (`order`)',
		'UPDATE folders SET `order` = created_time WHERE `order` = 0',
	];
};
