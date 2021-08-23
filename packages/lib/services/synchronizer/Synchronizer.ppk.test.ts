import { synchronizerStart, setupDatabaseAndSynchronizer, fileApi, switchClient } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import { fetchSyncInfo, localSyncInfo } from '../synchronizer/syncInfoUtils';

describe('Synchronizer.ppk', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should create a public private key pair if it does not exist', async () => {
		await Folder.save({});
		expect(localSyncInfo().ppk).toBeFalsy();
		await synchronizerStart();
		const remoteInfo = await fetchSyncInfo(fileApi());
		expect(localSyncInfo().ppk).toBeTruthy();
		expect(remoteInfo.ppk).toBeTruthy();
		const clientLocalPPK1 = localSyncInfo().ppk;

		await switchClient(2);

		expect(localSyncInfo().ppk).toBeFalsy();
		await synchronizerStart();
		expect(localSyncInfo().ppk).toBeTruthy();
		const clientLocalPPK2 = localSyncInfo().ppk;
		expect(clientLocalPPK1.privateKey).toBe(clientLocalPPK2.privateKey);
		expect(clientLocalPPK1.publicKey).toBe(clientLocalPPK2.publicKey);
	});

});
