import Logger from '@joplin/lib/Logger';
import { Pagination } from '../models/utils/pagination';
import { msleep } from '../utils/time';
import BaseService from './BaseService';
import { UserDeletion, UserFlagType, Uuid } from './database/types';

const logger = Logger.create('UserDeletionService');

export interface DeletionJobOptions {
	sleepBetweenOperations?: number;
}

export default class UserDeletionService extends BaseService {

	protected name_: string = 'UserDeletionService';

	private async deleteUserData(userId: Uuid, options: DeletionJobOptions) {
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

	private async deleteUserAccount(userId: Uuid, _options: DeletionJobOptions = null) {
		logger.info(`Deleting user account: ${userId}`);

		await this.models.userFlag().add(userId, UserFlagType.UserDeletionInProgress);

		await this.models.session().deleteByUserId(userId);
		await this.models.notification().deleteByUserId(userId);
		await this.models.user().delete(userId);
		await this.models.userFlag().deleteByUserId(userId);
	}

	public async processDeletionJob(deletion: UserDeletion, options: DeletionJobOptions = null) {
		options = {
			sleepBetweenOperations: 5000,
			...options,
		};

		logger.info('Starting user deletion: ', deletion);

		let error: any = null;
		let success: boolean = true;

		try {
			await this.models.userDeletion().start(deletion.id);
			if (deletion.process_data) await this.deleteUserData(deletion.user_id, options);
			if (deletion.process_account) await this.deleteUserAccount(deletion.user_id, options);
		} catch (e) {
			error = e;
			success = false;
			logger.error(`Processing deletion ${deletion.id}:`, error);
		}

		await this.models.userDeletion().end(deletion.id, success, error);

		logger.info('Completed user deletion: ', deletion.id);
	}

	public async processNextDeletionJob() {
		const deletion = await this.models.userDeletion().next();
		if (!deletion) return;
		await this.processDeletionJob(deletion);
	}

	protected async maintenance() {
		await this.processNextDeletionJob();
	}

}
