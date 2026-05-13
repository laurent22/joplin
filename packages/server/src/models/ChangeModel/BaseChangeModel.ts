import Logger from '@joplin/utils/Logger';
import { DbConnection, SqliteMaxVariableNum } from '../../db';
import { Change, Change2, ChangeType, Uuid } from '../../services/database/types';
import { Day, formatDateTime } from '../../utils/time';
import BaseModel, { LoadOptions } from '../BaseModel';
import { NewModelFactoryHandler } from '../factory';
import { Config } from '../../utils/types';
import type { RecordChangeOptions as RecordChangeOptionsBase } from './ChangeModel';

const logger = Logger.create('BaseChangeModel');


export const defaultChangeTtl = 180 * Day;

type RecordChangeOptions = RecordChangeOptionsBase;

export default abstract class BaseChangeModel<ChangeEntity extends Change2|Change> extends BaseModel<ChangeEntity> {

	public constructor(db: DbConnection, dbSlave: DbConnection, modelFactory: NewModelFactoryHandler, config: Config) {
		super(db, dbSlave, modelFactory, config);
	}

	protected hasUuid(): boolean {
		return true;
	}

	public changeUrl(): string {
		return `${this.baseUrl}/changes`;
	}

	public async first(options: LoadOptions): Promise<ChangeEntity|undefined> {
		return await this.db(this.tableName)
			.select(options.fields ?? this.defaultFields)
			.orderBy('counter', 'asc')
			.first();
	}

	public async allFromId(id: string, limit: number = SqliteMaxVariableNum): Promise<ChangeEntity[]> {
		const startChange: ChangeEntity = id ? await this.load(id) : null;
		const query = this.db(this.tableName).select(...this.defaultFields);
		if (startChange) void query.where('counter', '>', startChange.counter);
		void query.limit(limit).orderBy('counter', 'asc');
		return await query;
	}

	public abstract changesForUserQuery(userId: Uuid, fromCounter: number, limit: number, doCountQuery: boolean): Promise<ChangeEntity[]>;

	// See spec for complete documentation:
	// https://joplinapp.org/spec/server_delta_sync/#regarding-the-deletion-of-old-change-events
	public async compressOldChanges(ttl: number = null) {
		ttl = ttl === null ? defaultChangeTtl : ttl;
		const cutOffDate = Date.now() - ttl;
		const limit = 1000;
		const doneItemIds = new Set<Uuid>();

		interface ChangeReportItem {
			total: number;
			max_created_time: number;
			item_id: Uuid;
		}

		let error: Error = null;
		let totalDeletedCount = 0;

		logger.info(`compressOldChanges: Processing changes older than: ${formatDateTime(cutOffDate)} (${cutOffDate})`);

		while (true) {
			// First get all the UPDATE changes before the specified date, and
			// order by the items that had the most changes. Also for each item
			// get the most recent change date from within that time interval,
			// as we need this below.

			const query = this
				.db(this.tableName)
				.select('item_id')
				.count('id', { as: 'total' })
				.max('created_time', { as: 'max_created_time' })

				.where('type', '=', ChangeType.Update)
				.where('created_time', '<', cutOffDate)

				.groupBy('item_id')
				.orderBy('total', 'desc')
				// Use created_time to identify events caused by distinct changes. This is important.
				// In a share, there can be multiple "Update" change entries caused by the same event (one per
				// user). Each user needs to keep one of these latest updates.
				.havingRaw('count(DISTINCT created_time) > 1')
				.limit(limit);
			const changeReport: ChangeReportItem[] = await query;

			if (!changeReport.length) break;

			await this.withTransaction(async () => {
				for (const row of changeReport) {
					if (doneItemIds.has(row.item_id)) {
						// We don't throw from within the transaction because
						// that would rollback all other operations even though
						// they are valid. So we save the error and exit.
						error = new Error(`Trying to process an item that has already been done. Aborting. Row: ${JSON.stringify(row)}`);
						return;
					}

					// Still from within the specified interval, delete all
					// UPDATE changes, except for the most recent one (if any).

					const deletedCount = await this
						.db(this.tableName)
						.where('type', '=', ChangeType.Update)
						.where('created_time', '<', cutOffDate)
						.where('created_time', '<', row.max_created_time)
						.where('item_id', '=', row.item_id)
						.delete();

					totalDeletedCount += deletedCount;
					doneItemIds.add(row.item_id);
				}
			}, 'ChangeModel::compressOldChanges');

			logger.info(`compressOldChanges: Processed: ${doneItemIds.size} items. Deleted: ${totalDeletedCount} changes.`);

			if (error) throw error;
		}

		logger.info(`compressOldChanges: Finished processing. Done ${doneItemIds.size} items. Deleted: ${totalDeletedCount} changes.`);
	}

	public async deleteByItemIds(itemIds: Uuid[]) {
		if (!itemIds.length) return;

		await this.db(this.tableName)
			.whereIn('item_id', itemIds)
			.delete();
	}

	public abstract recordChange(options: RecordChangeOptions): Promise<void>;

}
