import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE sync_items ADD COLUMN remote_item_updated_time INT NOT NULL DEFAULT 0',
		// If file system sync is already setup for the current profile at the point of migration, default the new setting to false to avoid a rescan of all items
		'INSERT INTO settings (key, value) SELECT \'sync.2.detectBasedOnAnyTimestampChanges\', 0 WHERE EXISTS (SELECT 1 FROM sync_items WHERE sync_target = 2)',
	];
};
