import { Event, EventType } from '../services/database/types';
import BaseModel, { UuidType } from './BaseModel';
import { Week } from '../utils/time';


export default class EventModel extends BaseModel<Event> {

	public get tableName(): string {
		return 'events';
	}

	protected autoTimestampEnabled(): boolean {
		return false;
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public async create(type: EventType, name = '') {
		await this.save({
			name,
			type,
			created_time: Date.now(),
		});
	}

	public async lastEventByTypeAndName(type: EventType, name: string): Promise<Event | null> {
		return this
			.db(this.tableName)
			.where('type', '=', type)
			.where('name', '=', name)
			.orderBy('counter', 'desc')
			.first();
	}

	public async deleteOldEvents(beforeMillis: number = Date.now() - Week) {
		return this.withTransaction(async () => {
			await this.db(this.tableName)
				.where('created_time', '<', beforeMillis)
				.delete();
		}, 'EventModel::deleteOldEvents');
	}
}
