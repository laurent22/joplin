import { synchronizerStart, setupDatabaseAndSynchronizer, fileApi, switchClient, loadEncryptionMasterKey } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import { fetchSyncInfo, localSyncInfo, setEncryptionEnabled } from '../synchronizer/syncInfoUtils';
import { EncryptionMethod } from '../e2ee/EncryptionService';
import { updateMasterPassword } from '../e2ee/utils';

describe('Synchronizer.ppk', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should not create a public private key pair if not using E2EE', async () => {
		await Folder.save({});
		expect(localSyncInfo().ppk).toBeFalsy();
		await synchronizerStart();
		const remoteInfo = await fetchSyncInfo(fileApi());
		expect(localSyncInfo().ppk).toBeFalsy();
		expect(remoteInfo.ppk).toBeFalsy();
	});

	it('should create a public private key pair if it does not exist', async () => {
		await updateMasterPassword('', '111111');
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		const beforeTime = Date.now();

		await Folder.save({});
		expect(localSyncInfo().ppk).toBeFalsy();

		await synchronizerStart();
		const remoteInfo = await fetchSyncInfo(fileApi());
		expect(localSyncInfo().ppk).toBeTruthy();
		expect(remoteInfo.ppk).toBeTruthy();
		const clientLocalPPK1 = localSyncInfo().ppk;
		expect(clientLocalPPK1.createdTime).toBeGreaterThanOrEqual(beforeTime);
		expect(clientLocalPPK1.privateKey.encryptionMethod).toBe(EncryptionMethod.SJCL4);

		// Rather arbitrary length check - it's just to make sure there's
		// something there. Other tests should ensure the content is valid or
		// not.
		expect(clientLocalPPK1.privateKey.ciphertext.length).toBeGreaterThan(320);
		expect(clientLocalPPK1.publicKey.length).toBeGreaterThan(320);

		await switchClient(2);

		expect(localSyncInfo().ppk).toBeFalsy();
		await synchronizerStart();
		expect(localSyncInfo().ppk).toBeTruthy();
		const clientLocalPPK2 = localSyncInfo().ppk;
		expect(clientLocalPPK1.privateKey.ciphertext).toBe(clientLocalPPK2.privateKey.ciphertext);
		expect(clientLocalPPK1.publicKey).toBe(clientLocalPPK2.publicKey);
	});

});
