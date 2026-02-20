import addMigrationFile from '../addMigrationFile';
import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		// Add repeat_interval and last_trigger_time columns to alarms table for repeating notifications
		'ALTER TABLE `alarms` ADD COLUMN repeat_interval TEXT DEFAULT "none"',
		'ALTER TABLE `alarms` ADD COLUMN last_trigger_time INT NOT NULL DEFAULT 0',
		addMigrationFile(42),
	];
};
