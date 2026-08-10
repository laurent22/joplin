import time from '@joplin/lib/time';
import { DbConnection } from '../../db';
import newModelFactory from '../../models/factory';
import { AccountType } from '../../models/UserModel';
import { User, UserFlagType } from '../../services/database/types';
import { Config } from '../../utils/types';
import truncateUserDataTables from './truncateUserDataTables';

export interface CreateTestUsersOptions {
	count?: number;
	fromNum?: number;
}

export default async function createTestUsers(db: DbConnection, config: Config, options: CreateTestUsersOptions = null) {
	options = {
		count: 0,
		fromNum: 1,
		...options,
	};

	const password = '111111';
	const models = newModelFactory(db, db, config);

	await truncateUserDataTables(db);

	await models.user().save({
		email: 'admin@localhost',
		password: 'admin',
		is_admin: 1,
	});

	if (options.count) {
		const users: User[] = [];

		for (let i = 0; i < options.count; i++) {
			const userNum = i + options.fromNum;
			users.push({
				email: `user${userNum}@example.com`,
				password,
				full_name: `User ${userNum}`,
				account_type: userNum % 2 === 0 ? AccountType.Pro : AccountType.Basic,
			});
		}

		await models.user().saveMulti(users);
	} else {
		for (let userNum = 1; userNum <= 3; userNum++) {
			await models.user().save({
				email: `user${userNum}@example.com`,
				password,
				full_name: `User ${userNum}`,
				account_type: AccountType.Pro,
			});
		}

		{
			const { user } = await models.subscription().saveUserAndSubscription(
				'usersub@example.com',
				'With Sub',
				AccountType.Basic,
				'usr_111',
				'sub_111',
			);
			await models.user().save({ id: user.id, password });
		}

		{
			const { user, subscription } = await models.subscription().saveUserAndSubscription(
				'userfailedpayment@example.com',
				'Failed Payment',
				AccountType.Basic,
				'usr_222',
				'sub_222',
			);
			await models.user().save({ id: user.id, password });
			await models.subscription().handlePayment(subscription.stripe_subscription_id, false);
			await models.userFlag().add(user.id, UserFlagType.FailedPaymentWarning);
		}

		{
			const user = await models.user().save({
				email: 'userwithflags@example.com',
				password,
				full_name: 'User Withflags',
			});

			await models.userFlag().add(user.id, UserFlagType.AccountOverLimit);
			await time.sleep(2);
			await models.userFlag().add(user.id, UserFlagType.FailedPaymentWarning);
		}
	}
}
