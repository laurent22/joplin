import { UserDeletion, Uuid } from '../services/database/types';
import BaseModel from './BaseModel';

export default class UserDeletionModel extends BaseModel<UserDeletion> {

	protected get tableName(): string {
		return 'user_deletions';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async add(userId: Uuid, scheduledTime: number) {
		const o: UserDeletion = {
			user_id: userId,
			scheduled_time: scheduledTime,
		};

		await this.db(this.tableName).insert(o);
	}

	public async next() {
		return this
			.db(this.tableName)
			.where('scheduled_time', '<=', Date.now())
			.andWhere('start_time', '=', 0)
			.orderBy('scheduled_time', 'asc')
			.limit(1);
	}

	public async start(deletionId: number) {
		const now = Date.now();

		await this
			.db(this.tableName)
			.update({ start_time: now })
			.where('id', deletionId)
			.andWhere('start_time', '=', 0);

		const item = await this.load(deletionId);
		if (item.start_time !== now) throw new Error('Job was already started');
	}

}
