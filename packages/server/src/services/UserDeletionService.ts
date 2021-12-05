import Logger from '@joplin/lib/Logger';
import { Pagination } from '../models/utils/pagination';
import { msleep } from '../utils/time';
import BaseService from './BaseService';
import { UserFlagType, Uuid } from './database/types';

const logger = Logger.create('UserDeletionService');

export interface DeleteUserDataOptions {
	sleepBetweenOperations?: number;
}

export default class UserDeletionService extends BaseService {

	public async deleteUserData(userId: Uuid, options: DeleteUserDataOptions = null) {
		options = {
			sleepBetweenOperations: 5000,
			...options,
		};

		// While the "UserDeletionInProgress" flag is on, the account is
		// disabled so that no new items or other changes can happen.
		await this.models.userFlag().add(userId, UserFlagType.UserDeletionInProgress);

		try {
			// ---------------------------------------------------------------------
			// Delete own shares and shares participated in. Note that when the
			// shares are deleted, the associated user_items are deleted too, so we
			// don't need to wait for ShareService to run to continue.
			// ---------------------------------------------------------------------

			logger.info(`Deleting shares for user ${userId}`);

			await this.models.share().deleteByUserId(userId);
			await this.models.shareUser().deleteByUserId(userId);

			// ---------------------------------------------------------------------
			// Delete items. Also delete associated change objects.
			// ---------------------------------------------------------------------

			logger.info(`Deleting items for user ${userId}`);

			while (true) {
				const pagination: Pagination = {
					limit: 1000,
				};

				const page = await this.models.item().children(userId, '', pagination, { fields: ['id'] });
				if (!page.items.length) break;

				await this.models.item().delete(page.items.map(it => it.id), {
					deleteChanges: true,
				});

				await msleep(options.sleepBetweenOperations);
			}
		} finally {
			await this.models.userFlag().remove(userId, UserFlagType.UserDeletionInProgress);
		}
	}

	public async deleteUserAccount(userId: Uuid, _options: DeleteUserDataOptions = null) {
		await this.models.userFlag().add(userId, UserFlagType.UserDeletionInProgress);

		await this.models.session().deleteByUserId(userId);
		await this.models.notification().deleteByUserId(userId);
		await this.models.user().delete(userId);
		await this.models.userFlag().deleteByUserId(userId);
	}

	protected async maintenance() {
		const deletion = await this.models.userDeletion().next();
		if (!deletion) return;
	}

	// public async runInBackground() {
	// 	ChangeModel.eventEmitter.on('saved', this.scheduleMaintenance);
	// 	await super.runInBackground();
	// }

}
