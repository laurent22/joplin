import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE `resources` ADD COLUMN `ocr_driver_id` INT NOT NULL DEFAULT "1"',
	];
};
