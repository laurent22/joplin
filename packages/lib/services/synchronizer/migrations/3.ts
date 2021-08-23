import { FileApi } from '../../../file-api';
import JoplinDatabase from '../../../JoplinDatabase';
import { generateKeyPair } from '../../e2ee/ppk';
import { localSyncInfo, saveLocalSyncInfo, uploadSyncInfo } from '../syncInfoUtils';

export default async function(api: FileApi, _db: JoplinDatabase): Promise<void> {
	// The local sync info cache is populated on application startup so for the
	// migration we only need to upload that local cache.

	const syncInfo = localSyncInfo();
	syncInfo.version = 3;
	syncInfo.ppk = generateKeyPair();
	await uploadSyncInfo(api, syncInfo);
	saveLocalSyncInfo(syncInfo);
}
