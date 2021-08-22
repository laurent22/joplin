import { DbConnection, dropTables, migrateLatest } from '../db';
import newModelFactory from '../models/factory';
import { AccountType } from '../models/UserModel';
import { UserFlagType } from '../services/database/types';
import { Config } from '../utils/types';

export async function handleDebugCommands(argv: any, db: DbConnection, config: Config): Promise<boolean> {
	if (argv.debugCreateTestUsers) {
		await createTestUsers(db, config);
	} else {
		return false;
	}

	return true;
}

export async function createTestUsers(db: DbConnection, config: Config) {
	await dropTables(db);
	await migrateLatest(db);

	const password = 'hunter1hunter2hunter3';
	const models = newModelFactory(db, config);

	for (let userNum = 1; userNum <= 2; userNum++) {
		await models.user().save({
			email: `user${userNum}@example.com`,
			password,
			full_name: `User ${userNum}`,
		});
	}

	{
		const { user } = await models.subscription().saveUserAndSubscription(
			'usersub@example.com',
			'With Sub',
			AccountType.Basic,
			'usr_111',
			'sub_111'
		);
		await models.user().save({ id: user.id, password });
	}

	{
		const { user, subscription } = await models.subscription().saveUserAndSubscription(
			'userfailedpayment@example.com',
			'Failed Payment',
			AccountType.Basic,
			'usr_222',
			'sub_222'
		);
		await models.user().save({ id: user.id, password });
		await models.subscription().handlePayment(subscription.stripe_subscription_id, false);
	}

	{
		const user = await models.user().save({
			email: 'userwithflags@example.com',
			password,
			full_name: 'User Withflags',
		});

		await models.userFlag().add(user.id, UserFlagType.AccountOverLimit);
	}
}
