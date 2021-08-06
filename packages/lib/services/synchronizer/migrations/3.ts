import { FileApi } from '../../../file-api';
import JoplinDatabase from '../../../JoplinDatabase';
import Setting from '../../../models/Setting';
import { SyncInfo, updateSyncInfoCache, uploadSyncInfo } from '../syncInfoUtils';

export default async function(api: FileApi, db: JoplinDatabase) {
	const masterKeys = await db.selectAll('SELECT * FROM master_keys');

	const masterKeyMap: Record<string, any> = {};
	for (const mk of masterKeys) masterKeyMap[mk.id] = mk;

	const syncInfo = new SyncInfo();
	syncInfo.version = 3;
	syncInfo.e2ee = Setting.valueNoThrow('encryption.enabled', false);
	syncInfo.masterKeys = masterKeys;
	syncInfo.activeMasterKeyId = Setting.valueNoThrow('encryption.activeMasterKeyId', '');

	await uploadSyncInfo(api, syncInfo);
	await updateSyncInfoCache(syncInfo);
}
