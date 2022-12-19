import { SqlQuery } from '../../database';
import JoplinDatabase from '../../JoplinDatabase';
import BaseItem from '../../models/BaseItem';
import Setting from '../../models/Setting';
import SyncTargetRegistry from '../../SyncTargetRegistry';

async function clearSyncContext() {
	const syncTargetIds = SyncTargetRegistry.allIds();

	for (const syncTargetId of syncTargetIds) {
		const key = `sync.${syncTargetId}.context`;
		if (Setting.keyExists(key)) {
			Setting.resetKey(key);
		}
	}

	await Setting.saveAll();
}

export async function clearLocalSyncStateForReupload(db: JoplinDatabase) {
	const queries: SqlQuery[] = [
		{ sql: 'DELETE FROM deleted_items' },
		{ sql: 'DELETE FROM sync_items' },
	];

	await db.transactionExecBatch(queries);

	await clearSyncContext();
}

export async function clearLocalDataForRedownload(db: JoplinDatabase) {
	const queries: SqlQuery[] = [
		{ sql: 'DELETE FROM deleted_items' },
		{ sql: 'DELETE FROM sync_items' },
		{ sql: 'DELETE FROM item_changes' },
		{ sql: 'DELETE FROM note_resources' },
	];

	const syncItemTypes = BaseItem.syncItemTypes();

	for (const syncItemType of syncItemTypes) {
		const SyncItemClass = BaseItem.getClassByItemType(syncItemType);
		queries.push({ sql: `DELETE FROM ${db.escapeField(SyncItemClass.tableName())}` });
	}

	await db.transactionExecBatch(queries);

	await clearSyncContext();
}
