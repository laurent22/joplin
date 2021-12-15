import { UserDeletion, Uuid } from '../services/database/types';
import { errorToString } from '../utils/errors';
import BaseModel from './BaseModel';

export interface AddOptions {
	processData?: boolean;
	processAccount?: boolean;
}

export default class UserDeletionModel extends BaseModel<UserDeletion> {

	protected get tableName(): string {
		return 'user_deletions';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async byUserId(userId: Uuid): Promise<UserDeletion> {
		return this.db(this.tableName).where('user_id', '=', userId).first();
	}

	public async isScheduledForDeletion(userId: Uuid) {
		const r = await this.db(this.tableName).select(['id']).where('user_id', '=', userId).first();
		return !!r;
	}

	public async add(userId: Uuid, scheduledTime: number, options: AddOptions = null): Promise<UserDeletion> {
		options = {
			processAccount: true,
			processData: true,
			...options,
		};

		const now = Date.now();

		const o: UserDeletion = {
			user_id: userId,
			scheduled_time: scheduledTime,
			created_time: now,
			updated_time: now,
			process_account: options.processAccount ? 1 : 0,
			process_data: options.processData ? 1 : 0,
		};

		await this.db(this.tableName).insert(o);

		return this.byUserId(userId);
	}

	public async remove(jobId: number) {
		await this.db(this.tableName).where('id', '=', jobId).delete();
	}

	public async next(): Promise<UserDeletion> {
		return this
			.db(this.tableName)
			.where('scheduled_time', '<=', Date.now())
			.andWhere('start_time', '=', 0)
			.orderBy('scheduled_time', 'asc')
			.first();
	}

	public async start(deletionId: number) {
		const now = Date.now();

		await this
			.db(this.tableName)
			.update({ start_time: now, updated_time: now })
			.where('id', deletionId)
			.andWhere('start_time', '=', 0);

		const item = await this.load(deletionId);
		if (item.start_time !== now) throw new Error('Job was already started');
	}

	public async end(deletionId: number, success: boolean, error: any) {
		const now = Date.now();

		const o: UserDeletion = {
			end_time: now,
			updated_time: now,
			success: success ? 1 : 0,
			error: error ? errorToString(error) : '',
		};

		await this
			.db(this.tableName)
			.update(o)
			.where('id', deletionId);
	}

}
