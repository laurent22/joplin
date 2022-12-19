import { FileApi } from '../../../file-api';
import JoplinDatabase from '../../../JoplinDatabase';
import { localSyncInfo, saveLocalSyncInfo, uploadSyncInfo } from '../syncInfoUtils';

export default async function(api: FileApi, _db: JoplinDatabase): Promise<void> {
	// The local sync info cache is populated on application startup so for the
	// migration we only need to upload that local cache.

	const syncInfo = localSyncInfo();
	syncInfo.version = 3;
	await uploadSyncInfo(api, syncInfo);
	saveLocalSyncInfo(syncInfo);
}
