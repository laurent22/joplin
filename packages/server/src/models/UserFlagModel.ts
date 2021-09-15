import { isUniqueConstraintError } from '../db';
import { User, UserFlag, UserFlagType, Uuid } from '../services/database/types';
import BaseModel from './BaseModel';

interface AddRemoveOptions {
	updateUser?: boolean;
}

function defaultAddRemoveOptions(): AddRemoveOptions {
	return {
		updateUser: true,
	};
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
			});
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
	private async updateUserFromFlags(userId: Uuid) {
		const flags = await this.allByUserId(userId);
		const user = await this.models().user().load(userId, { fields: ['id', 'can_upload', 'enabled'] });

		const newProps: User = {
			can_upload: 1,
			enabled: 1,
		};

		if (flags.find(f => f.type === UserFlagType.AccountWithoutSubscription)) {
			newProps.can_upload = 0;
		} else if (flags.find(f => f.type === UserFlagType.AccountOverLimit)) {
			newProps.can_upload = 0;
		} else if (flags.find(f => f.type === UserFlagType.FailedPaymentWarning)) {
			newProps.can_upload = 0;
		} else if (flags.find(f => f.type === UserFlagType.FailedPaymentFinal)) {
			newProps.enabled = 0;
		} else if (flags.find(f => f.type === UserFlagType.SubscriptionCancelled)) {
			newProps.enabled = 0;
		} else if (flags.find(f => f.type === UserFlagType.ManuallyDisabled)) {
			newProps.enabled = 0;
		}

		if (user.can_upload !== newProps.can_upload || user.enabled !== newProps.enabled) {
			await this.models().user().save({
				id: userId,
				...newProps,
			});
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

}
