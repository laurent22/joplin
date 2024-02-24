import { Event, EventType } from '../services/database/types';
import BaseModel, { UuidType } from './BaseModel';

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

	public async create(type: EventType, name = '', created_time = Date.now()) {
		await this.save({
			name,
			type,
			created_time,
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

	public async deleteOldEvents(before: number) {
		return this.withTransaction(async () => {
			await this.db(this.tableName)
				.where('created_time', '<', before)
				.delete();
		}, 'EventModel::deleteOldEvents');
	}
}
