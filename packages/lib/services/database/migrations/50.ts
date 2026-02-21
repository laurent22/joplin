import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		// Add alarm_interval to notes for storing repeating alarm interval
		'ALTER TABLE `notes` ADD COLUMN `alarm_interval` TEXT NOT NULL DEFAULT "none"',
		// Add repeat_interval and last_trigger_time to alarms for repeating notifications
		'ALTER TABLE `alarms` ADD COLUMN repeat_interval TEXT DEFAULT "none"',
		'ALTER TABLE `alarms` ADD COLUMN last_trigger_time INT NOT NULL DEFAULT 0',
	];
};
