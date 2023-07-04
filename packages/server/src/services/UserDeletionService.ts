import Logger from '@joplin/lib/Logger';
import { Pagination } from '../models/utils/pagination';
import { Day, msleep } from '../utils/time';
import BaseService from './BaseService';
import { BackupItemType, UserDeletion, UserFlagType, Uuid } from './database/types';

const logger = Logger.create('UserDeletionService');

export interface DeletionJobOptions {
	sleepBetweenOperations?: number;
}

export default class UserDeletionService extends BaseService {

	protected name_ = 'UserDeletionService';

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

		const user = await this.models.user().load(userId);
		if (!user) throw new Error(`No such user: ${userId}`);

		const flags = await this.models.userFlag().allByUserId(userId);

		await this.models.backupItem().add(
			BackupItemType.UserAccount,
			user.email,
			JSON.stringify({
				user,
				flags,
			}),
			userId
		);

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

		// Normally, a user that is still enabled should not be processed here,
		// because it should not have been queued to begin with (or if it was
		// queued, then enabled, it should have been removed from the queue).
		// But as a fail safe we have this extra check.
		//
		// We also remove the job from the queue so that the service doesn't try
		// to process it again.
		const user = await this.models.user().load(deletion.user_id);
		if (user.enabled) {
			logger.error(`Trying to delete a user that is still enabled - aborting and removing the user from the queue. Deletion job: ${JSON.stringify(deletion)}`);
			await this.models.userDeletion().removeFromQueueByUserId(user.id);
			return;
		}

		let error: any = null;
		let success = true;

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

	public async autoAddForDeletion() {
		const addedUserIds = await this.models.userDeletion().autoAdd(
			10,
			this.config.USER_DATA_AUTO_DELETE_AFTER_DAYS * Day,
			Date.now() + 3 * Day,
			{
				processAccount: true,
				processData: true,
			}
		);

		if (addedUserIds.length) {
			logger.info(`autoAddForDeletion: Queued ${addedUserIds.length} users for deletions: ${addedUserIds.join(', ')}`);
		} else {
			logger.info('autoAddForDeletion: No users were queued for deletion');
		}
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
