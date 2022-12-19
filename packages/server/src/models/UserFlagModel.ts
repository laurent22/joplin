import Logger from '@joplin/lib/Logger';
import { isUniqueConstraintError } from '../db';
import { User, UserFlag, UserFlagType, userFlagTypeToLabel, Uuid } from '../services/database/types';
import { formatDateTime } from '../utils/time';
import BaseModel from './BaseModel';

const logger = Logger.create('UserFlagModel');

interface AddRemoveOptions {
	updateUser?: boolean;
}

function defaultAddRemoveOptions(): AddRemoveOptions {
	return {
		updateUser: true,
	};
}

export function userFlagToString(flag: UserFlag): string {
	return `${userFlagTypeToLabel(flag.type)} on ${formatDateTime(flag.created_time)}`;
}

export default class UserFlagModels extends BaseModel<UserFlag> {

	public get tableName(): string {
		return 'user_flags';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(userId: Uuid, type: UserFlagType, options: AddRemoveOptions = {}): Promise<void> {
		options = {
			...defaultAddRemoveOptions(),
			...options,
		};

		try {
			await this.save({
				user_id: userId,
				type,
			}, { queryContext: { uniqueConstraintErrorLoggingDisabled: true } });
		} catch (error) {
			if (!isUniqueConstraintError(error)) {
				throw error;
			}
		}

		if (options.updateUser) await this.updateUserFromFlags(userId);
	}

	public async remove(userId: Uuid, type: UserFlagType, options: AddRemoveOptions = null) {
		options = {
			...defaultAddRemoveOptions(),
			...options,
		};

		await this.db(this.tableName)
			.where('user_id', '=', userId)
			.where('type', '=', type)
			.delete();

		if (options.updateUser) await this.updateUserFromFlags(userId);
	}

	public async toggle(userId: Uuid, type: UserFlagType, apply: boolean, options: AddRemoveOptions = null) {
		if (apply) {
			await this.add(userId, type, options);
		} else {
			await this.remove(userId, type, options);
		}
	}

	public async addMulti(userId: Uuid, flagTypes: UserFlagType[]) {
		await this.withTransaction(async () => {
			for (const flagType of flagTypes) {
				await this.add(userId, flagType, { updateUser: false });
			}
			await this.updateUserFromFlags(userId);
		}, 'UserFlagModels::addMulti');
	}

	public async removeMulti(userId: Uuid, flagTypes: UserFlagType[]) {
		if (!flagTypes.length) return;

		await this.withTransaction(async () => {
			for (const flagType of flagTypes) {
				await this.remove(userId, flagType, { updateUser: false });
			}
			await this.updateUserFromFlags(userId);
		}, 'UserFlagModels::removeMulti');
	}

	// As a general rule the `enabled` and  `can_upload` properties should not
	// be set directly (except maybe in tests) - instead the appropriate user
	// flags should be set, and this function will derive the enabled/can_upload
	// properties from them.
	public async updateUserFromFlags(userId: Uuid) {
		const flags = await this.allByUserId(userId);
		const user = await this.models().user().load(userId, { fields: ['id', 'can_upload', 'enabled'] });

		const newProps: User = {
			can_upload: 1,
			enabled: 1,
		};

		const accountWithoutSubscriptionFlag = flags.find(f => f.type === UserFlagType.AccountWithoutSubscription);
		const accountOverLimitFlag = flags.find(f => f.type === UserFlagType.AccountOverLimit);
		const failedPaymentWarningFlag = flags.find(f => f.type === UserFlagType.FailedPaymentWarning);
		const failedPaymentFinalFlag = flags.find(f => f.type === UserFlagType.FailedPaymentFinal);
		const subscriptionCancelledFlag = flags.find(f => f.type === UserFlagType.SubscriptionCancelled);
		const manuallyDisabledFlag = flags.find(f => f.type === UserFlagType.ManuallyDisabled);
		const userDeletionInProgress = flags.find(f => f.type === UserFlagType.UserDeletionInProgress);

		if (accountWithoutSubscriptionFlag) {
			newProps.can_upload = 0;
		}

		if (accountOverLimitFlag) {
			newProps.can_upload = 0;
		}

		if (failedPaymentWarningFlag) {
			newProps.can_upload = 0;
		}

		if (failedPaymentFinalFlag) {
			newProps.enabled = 0;
		}

		if (subscriptionCancelledFlag) {
			newProps.enabled = 0;
		}

		if (manuallyDisabledFlag) {
			newProps.enabled = 0;
		}

		if (userDeletionInProgress) {
			newProps.enabled = 0;
		}

		let removeFromDeletionQueue = false;

		if (!user.enabled && newProps.enabled) {
			if (await this.models().userDeletion().isDeletedOrBeingDeleted(userId)) {
				// User account is being deleted or already deleted and cannot
				// be enabled again.
				logger.error('Trying to enable an account that is queued for deletion - leaving account disabled');
				newProps.enabled = 0;
			} else {
				// If the user has been re-enabled, we want to remove it from
				// the deletion queue (if it has been queued there) immediately,
				// so that it doesn't incorrectly get deleted.
				removeFromDeletionQueue = true;
			}
		}

		if (user.enabled !== newProps.enabled) {
			newProps.disabled_time = !newProps.enabled ? Date.now() : 0;
		}

		if (user.can_upload !== newProps.can_upload || user.enabled !== newProps.enabled) {
			await this.withTransaction(async () => {
				if (removeFromDeletionQueue) await this.models().userDeletion().removeFromQueueByUserId(userId);

				await this.models().user().save({
					id: userId,
					...newProps,
				});
			}, 'UserFlagModel::updateUserFromFlags');
		}
	}

	public async byUserId(userId: Uuid, type: UserFlagType): Promise<UserFlag> {
		return this.db(this.tableName)
			.where('user_id', '=', userId)
			.where('type', '=', type)
			.first();
	}

	public async allByUserId(userId: Uuid): Promise<UserFlag[]> {
		return this.db(this.tableName).where('user_id', '=', userId);
	}

	public async deleteByUserId(userId: Uuid) {
		await this.db(this.tableName).where('user_id', '=', userId).delete();
	}

}
