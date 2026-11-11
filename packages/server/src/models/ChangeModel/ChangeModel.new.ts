import Logger from '@joplin/utils/Logger';
import { DbConnection } from '../../db';
import { Change2, ChangeType, Uuid } from '../../services/database/types';
import { UuidType } from '../BaseModel';
import { PaginatedResults } from '../utils/pagination';
import { NewModelFactoryHandler } from '../factory';
import { Config } from '../../utils/types';
import type { RecordChangeOptions as RecordChangeOptionsBase } from './ChangeModel';
import { uuidgen } from '../../utils/uuid';
import dbuuid from '../../utils/dbuuid';
import BaseChangeModel from './BaseChangeModel';

const logger = Logger.create('ChangeModel.new');


export type PaginatedChanges = PaginatedResults<Change2>;

type RecordChangeOptions = RecordChangeOptionsBase;

export default class ChangeModel extends BaseChangeModel<Change2> {

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		super(db, dbSlave, modelFactory, config);
	}

	public override get tableName(): string {
		return 'changes_2';
	}

	public override async changesForUserQuery(userId: Uuid, fromCounter: number, limit: number, doCountQuery: boolean): Promise<Change2[]> {
		const fields = [
			'id',
			'item_id',
			'item_name',
			'previous_share_id',
			'type',
			'updated_time',
			'counter',
		];

		let query = this.dbSlave(this.tableName);
		if (doCountQuery) {
			query = query.count('*', { as: 'total' });
		} else {
			query = query.select(fields);
		}
		query = query
			.where('counter', '>', fromCounter)
			.andWhere('user_id', '=', userId);

		if (!doCountQuery) {
			query = query
				.orderBy('counter', 'asc')
				.limit(limit);
		}

		const results: Change2[] = await query;
		return results;
	}

	public override async recordChange({
		shareId, sourceUserId, itemId, itemName, itemType, type, previousItem,
	}: RecordChangeOptions) {
		const changes: Change2[] = [];

		// All per-user changes for the same item are given the same created/updated time
		// to simplify grouping these changes together during change compression:
		const time = Date.now();

		const addChangeForUser = (userId: Uuid) => {
			changes.push({
				item_id: itemId,
				item_name: itemName,
				item_type: itemType,
				type,
				previous_share_id: previousItem.jop_share_id ?? '',
				user_id: userId,
				id: this.uuidType() === UuidType.NanoId ? uuidgen() : dbuuid(),
				created_time: time,
				updated_time: time,
			});
		};

		if (type === ChangeType.Update) {
			const share = shareId ? await this.models().share().load(shareId) : null;
			let allUserIds = share ? await this.models().share().allShareUserIds(share) : [sourceUserId];
			if (!allUserIds.includes(sourceUserId)) {
				logger.warn('Adding sourceUserId to allUserIds because it was missing');
				allUserIds = [...allUserIds, sourceUserId];
			}

			// Post a change for all users that can access the item
			for (const userId of allUserIds) {
				addChangeForUser(userId);
			}
		} else {
			addChangeForUser(sourceUserId);
		}

		// For performance, apply all of the changes at once. Applying the changes one at a time
		// can take several seconds to run for large shares.
		await this.db(this.tableName).insert(changes);
	}

}
