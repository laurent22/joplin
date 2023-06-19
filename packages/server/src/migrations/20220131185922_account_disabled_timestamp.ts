import { Knex } from 'knex';
import { DbConnection } from '../db';

// It's assumed that the input user IDs are disabled.
// The disabled_time will be set to the first flag created_time
export const setUserAccountDisabledTimes = async (db: DbConnection, userIds: string[]) => {
	// FailedPaymentFinal = 2,
	// SubscriptionCancelled = 5,
	// ManuallyDisabled = 6,
	// UserDeletionInProgress = 7,

	interface UserFlag {
		user_id: string;
		created_time: number;
	}

	const flags: UserFlag[] = await db('user_flags')
		.select(['user_id', 'created_time'])
		.whereIn('user_id', userIds)
		.whereIn('type', [2, 5, 6, 7])
		.orderBy('created_time', 'asc');

	for (const userId of userIds) {
		const flag = flags.find(f => f.user_id === userId);

		if (!flag) {
			console.warn(`Found a disabled account without an associated flag. Setting disabled timestamp to current time: ${userId}`);
		}

		await db('users')
			.update({ disabled_time: flag ? flag.created_time : Date.now() })
			.where('id', '=', userId);
	}
};

export const disabledUserIds = async (db: DbConnection): Promise<string[]> => {
	const users = await db('users').select(['id']).where('enabled', '=', 0);
	return users.map(u => u.id);
};

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.bigInteger('disabled_time').defaultTo(0).notNullable();
	});

	const userIds = await disabledUserIds(db);
	await setUserAccountDisabledTimes(db, userIds);
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('disabled_time');
	});
};
