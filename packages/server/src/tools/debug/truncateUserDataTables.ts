import { DbConnection, truncateTables } from '../../db';

const includedTables = [
	'changes',
	'changes_2',
	'emails',
	'events',
	'item_resources',
	'items',
	'notifications',
	'sessions',
	'share_users',
	'shares',
	'subscriptions',
	'user_deletions',
	'user_flags',
	'user_items',
	'users',
];

const truncateUserDataTables = (db: DbConnection) => {
	return truncateTables(db, includedTables);
};

export default truncateUserDataTables;
