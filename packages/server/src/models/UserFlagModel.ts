import { isUniqueConstraintError, UserFlag, UserFlagType, Uuid } from '../db';
import BaseModel from './BaseModel';

export default class TokenModel extends BaseModel<UserFlag> {

	public get tableName(): string {
		return 'user_flags';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(userId: Uuid, type: UserFlagType) {
		const now = Date.now();

		try {
			const output = await this.save({
				user_id: userId,
				type,
				created_time: now,
				updated_time: now,
			});
			return output;
		} catch (error) {
			if (isUniqueConstraintError(error)) return this.byUserId(userId, type);
			throw error;
		}
	}

	public async remove(userId: Uuid, type: UserFlagType) {
		await this.db(this.tableName)
			.where('user_id', '=', userId)
			.where('type', '=', type)
			.delete();
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
