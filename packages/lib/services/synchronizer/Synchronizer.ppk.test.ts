import { synchronizerStart, setupDatabaseAndSynchronizer, fileApi, switchClient, loadEncryptionMasterKey, encryptionService, withWarningSilenced, synchronizer, createMockReduxStore } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import { fetchSyncInfo, localSyncInfo, saveLocalSyncInfo, setEncryptionEnabled, uploadSyncInfo } from '../synchronizer/syncInfoUtils';
import { EncryptionMethod } from '../e2ee/EncryptionService';
import { updateMasterPassword } from '../e2ee/utils';
import { generateKeyPair } from '../e2ee/ppk/ppk';
import Setting from '../../models/Setting';

const generateMismatchedPpk = async (ppkPassword: string) => {
	const ppk1 = await generateKeyPair(encryptionService(), ppkPassword);
	const ppk2 = await generateKeyPair(encryptionService(), ppkPassword);
	return {
		...ppk1,
		publicKey: ppk2.publicKey,
	};
};

const uploadMismatchedPublicPrivateKeySyncInfo = async (ppkPassword: string) => {
	const syncInfo = await fetchSyncInfo(fileApi());
	syncInfo.ppk = await generateMismatchedPpk(ppkPassword);
	await uploadSyncInfo(fileApi(), syncInfo);
};

const syncAndExpectPpkWarning = async () => {
	await withWarningSilenced(/Incorrect public key|There was some errors/, () => {
		return synchronizerStart();
	}, { requireWarning: true });
};

const uploadMatchingPublicPrivateKeySyncInfo = async (ppkPassword: string) => {
	const syncInfo = await fetchSyncInfo(fileApi());
	syncInfo.ppk = await generateKeyPair(encryptionService(), ppkPassword);
	await uploadSyncInfo(fileApi(), syncInfo);
};

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

	it('should check that the public and private keys match', async () => {
		await updateMasterPassword('', '111111');
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		await Folder.save({});

		await synchronizerStart();
		const originalPpk = localSyncInfo().ppk;
		const remoteInfo = await fetchSyncInfo(fileApi());
		expect(originalPpk).toBeTruthy();
		expect(remoteInfo.ppk).toBeTruthy();

		const otherPpk = await generateKeyPair(encryptionService(), '222222');
		remoteInfo.ppk = {
			...remoteInfo.ppk,
			publicKey: otherPpk.publicKey,
			createdTime: Date.now() + 1,
		};
		await uploadSyncInfo(fileApi(), remoteInfo);

		await withWarningSilenced(/Incorrect public key:|There was some errors/, async () => {
			await synchronizerStart();
		}, { requireWarning: true });
	});

	// The PPK cannot be checked without a valid master password
	it('should skip ppk validation if the master password is not valid', async () => {
		await updateMasterPassword('', '111111');
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		await Folder.save({});

		await synchronizerStart();

		const remoteInfo = await fetchSyncInfo(fileApi());
		const newCreatedTime = Date.now() + 1;
		remoteInfo.ppk = {
			...remoteInfo.ppk,
			createdTime: newCreatedTime,
		};
		await uploadSyncInfo(fileApi(), remoteInfo);

		Setting.setValue('encryption.masterPassword', 'wrong!');
		await synchronizerStart();

		expect(localSyncInfo().ppk.createdTime).toBe(newCreatedTime);
	});

	it('should dispatch when ppk must be fixed by the user and when ppk has been fixed', async () => {
		await updateMasterPassword('', '111111');
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		await Folder.save({});
		await synchronizerStart();

		const store = createMockReduxStore();
		synchronizer().dispatch = store.dispatch;

		await uploadMismatchedPublicPrivateKeySyncInfo('111111');
		await syncAndExpectPpkWarning();

		expect(store.getState().mustFixPpk).toBe(true);

		await uploadMatchingPublicPrivateKeySyncInfo('111111');
		await synchronizerStart();

		expect(store.getState().mustFixPpk).toBe(false);
	});

	it('should not recheck the PPK if the last check was marked as successful', async () => {
		await updateMasterPassword('', '111111');
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();

		const store = createMockReduxStore();
		synchronizer().dispatch = store.dispatch;

		const syncInfo = localSyncInfo();
		syncInfo.ppk = await generateMismatchedPpk('111111');
		saveLocalSyncInfo(syncInfo);

		const simulateLastCheckWasSuccessful = (successful: boolean) => {
			Setting.setValue('sync.lastPpkConsistencyCheck', {
				valid: successful,
				ppk: JSON.stringify(localSyncInfo().ppk),
			});
		};

		// Should not re-check if the last check was successful
		simulateLastCheckWasSuccessful(true);
		await synchronizerStart();
		expect(store.getState().mustFixPpk).toBe(false);

		// Should re-check if the last check failed
		simulateLastCheckWasSuccessful(false);
		await syncAndExpectPpkWarning();
		expect(store.getState().mustFixPpk).toBe(true);
	});
});
