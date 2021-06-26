import { FileApi } from '../../../file-api';
import JoplinDatabase from '../../../JoplinDatabase';
import Setting from '../../../models/Setting';
import { localSyncTargetInfo, setRemoteSyncTargetInfo, SyncTargetInfo } from '../syncTargetInfoUtils';

export default async function(api: FileApi, _db: JoplinDatabase) {
	const syncInfo: SyncTargetInfo = {
		...localSyncTargetInfo(),
		version: 3,
		updatedTime: Date.now(),
	};

	await setRemoteSyncTargetInfo(api, syncInfo);
	Setting.setValue('sync.info', JSON.stringify(syncInfo));
}
