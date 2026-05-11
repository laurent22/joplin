import { Knex } from 'knex';
import { DbConnection, isPostgres } from '../../db';
import { Change, ChangeType, Uuid } from '../../services/database/types';
import { PaginatedResults } from '../utils/pagination';
import { NewModelFactoryHandler } from '../factory';
import { Config } from '../../utils/types';
import type { RecordChangeOptions } from './ChangeModel';
import BaseChangeModel from './BaseChangeModel';

export type PaginatedChanges = PaginatedResults<Change>;

export interface ChangePreviousItem {
	jop_share_id: string;
}

export default class ChangeModel extends BaseChangeModel<Change> {

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		super(db, dbSlave, modelFactory, config);
	}

	public override get tableName(): string {
		return 'changes';
	}

	public serializePreviousItem(item: ChangePreviousItem): string {
		return JSON.stringify(item);
	}

	public override async changesForUserQuery(userId: Uuid, fromCounter: number, limit: number, doCountQuery: boolean): Promise<Change[]> {
		// When need to get:
		//
		// - All the CREATE and DELETE changes associated with the user
		// - All the UPDATE changes that applies to items associated with the
		//   user.
		//
		// UPDATE changes do not have the user_id set because they are specific
		// to the item, not to a particular user.

		// The extra complexity is due to the fact that items can be shared between users.
		//
		// - CREATE: When a user creates an item, a corresponding user_item is added to their
		//   collection. When that item is shared with another user, a user_item is also added to
		//   that user's collection, via ShareModel::updateSharedItems(). Each user has their own
		//   `change` object for the creation operations. For example if a user shares a note with
		//   two users, there will be a total of three `change` objects for that item, each
		//   associated with on of these users. See UserItemModel::addMulti()
		//
		// - DELETE: When an item is deleted, all corresponding user_items are deleted. Likewise,
		//   there's a `change` object per user. See UserItemModel::deleteBy()
		//
		// - UPDATE: Updates are different because only one `change` object will be created per
		//   change, even if the item is shared multiple times. This is why we need a different
		//   query for it. See ItemModel::save()

		// This used to be just one query but it kept getting slower and slower
		// as the `changes` table grew. So it is now split into two queries
		// merged by a UNION ALL.

		const fields = [
			'id',
			'item_id',
			'item_name',
			'type',
			'updated_time',
			'counter',
		];

		const fieldsSql = `"${fields.join('", "')}"`;

		const subQuery1 = `
			SELECT ${fieldsSql}
			FROM "changes"
			WHERE counter > ?
			AND (type = ? OR type = ?)
			AND user_id = ?
			ORDER BY "counter" ASC
			${doCountQuery ? '' : 'LIMIT ?'}
		`;

		const subParams1 = [
			fromCounter,
			ChangeType.Create,
			ChangeType.Delete,
			userId,
		];

		if (!doCountQuery) subParams1.push(limit);

		// The "+ 0" was added to prevent Postgres from scanning the `changes` table in `counter`
		// order, which is an extremely slow query plan. With "+ 0" it went from 2 minutes to 6
		// seconds for a particular query. https://dba.stackexchange.com/a/338597/37012
		//
		// ## 2025-11-06
		//
		// Remove the "+ 0" because now it appears to make query slower by preventing the query
		// planner from using the index. Using Postgres 16.8
		//
		// ## 2025-11-08
		//
		// This query shape, with `ui AS MATERIALIZED` ensures that Postgres query planner will use
		// the index `changes_item_id_counter_type2_index`, which was created specifically for that
		// query. With the join (as previously) the planner uses the `counter` index and ends up
		// walking through millions of rows in the `changes` table.
		//
		// This new query improves this part, however it's still not perfect because it will be
		// relatively slow for users with hundreds of thousands of items. But at least the
		// performance won't be bound to the size of the `changes` table anymore, and it will be
		// fast for users with a normal amount of items.
		//
		// Keeping the previous query here because it's more readable and equivalent. It could be a
		// use as a base for a refactoring:
		//
		// ```
		// SELECT ${changesFieldsSql}
		// FROM "changes"
		// JOIN "user_items" ON user_items.item_id = changes.item_id
		// WHERE counter > ?
		// AND type = ?
		// AND user_items.user_id = ?
		// ORDER BY "counter" ASC
		// ${doCountQuery ? '' : 'LIMIT ?'}
		// ```

		const changesFieldsSql = fields
			.map(f => `"changes"."${f}" AS "${f}"`)
			.join(', ');

		const subQuery2 = `
			WITH ui AS MATERIALIZED (
				SELECT item_id
				FROM user_items
				WHERE user_id = ?
			)
			SELECT ${changesFieldsSql}
			FROM changes
			WHERE type = ?
				AND counter > ?
				AND EXISTS (
					SELECT 1
					FROM ui
					WHERE ui.item_id = changes.item_id
				)
			ORDER BY counter
			${doCountQuery ? '' : 'LIMIT ?'}
		`;

		const subParams2 = [
			userId,
			ChangeType.Update,
			fromCounter,
		];

		if (!doCountQuery) subParams2.push(limit);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let query: Knex.Raw<any> = null;

		const finalParams = subParams1.concat(subParams2);

		// For Postgres, we need to use materialized tables because, even
		// though each independent query is fast, the query planner end up going
		// for a very slow plan when they are combined with UNION ALL.
		// https://dba.stackexchange.com/a/333147/37012
		//
		// Normally we could use the same query for SQLite since it supports
		// materialized views too, but it doesn't work for some reason so we
		// keep the non-optimised query.

		if (!doCountQuery) {
			finalParams.push(limit);

			if (isPostgres(this.dbSlave)) {
				query = this.dbSlave.raw(`
					WITH cte1 AS MATERIALIZED (
						${subQuery1}
					)
					, cte2 AS MATERIALIZED (
						${subQuery2}
					)
					TABLE cte1
					UNION ALL
					TABLE cte2
					ORDER BY counter ASC
					LIMIT ?
				`, finalParams);
			} else {
				query = this.dbSlave.raw(`
					SELECT ${fieldsSql} FROM (${subQuery1}) as sub1
					UNION ALL				
					SELECT ${fieldsSql} FROM (${subQuery2}) as sub2
					ORDER BY counter ASC
					LIMIT ?
				`, finalParams);
			}
		} else {
			query = this.dbSlave.raw(`
				SELECT count(*) as total
				FROM (
					SELECT counter FROM (${subQuery1}) as sub1
					UNION ALL				
					SELECT counter FROM (${subQuery2}) as sub2
				) AS merged
			`, finalParams);
		}

		const results = await query;

		// Because it's a raw query, we need to handle the results manually:
		// Postgres returns an object with a "rows" property, while SQLite
		// returns the rows directly;
		const output: Change[] = results.rows ? results.rows : results;
		return output;
	}

	// This function implementation is intended for testing only: After creating
	// changes_2, the changes table should be frozen.
	public override async recordChange({
		sourceUserId, itemId, itemName, type, previousItem, itemType,
	}: RecordChangeOptions) {
		await this.save({
			item_type: itemType,
			item_id: itemId,
			item_name: itemName,
			type,
			previous_item: this.serializePreviousItem(previousItem),
			user_id: sourceUserId,
		});
	}
}
