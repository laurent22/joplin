import { FileApi } from '../../../file-api';
import JoplinDatabase from '../../../JoplinDatabase';
import { localSyncInfo, updateLocalSyncInfo } from '../syncInfoUtils';

export default async function(_pi: FileApi, _db: JoplinDatabase): Promise<void> {
	// The local sync info cache is populated on application startup so for the
	// migration we only need to upload that local cache.

	const syncInfo = localSyncInfo();
	await updateLocalSyncInfo(syncInfo);
}
