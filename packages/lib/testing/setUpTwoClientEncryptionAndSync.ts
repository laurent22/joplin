
import Setting from '../models/Setting';
import { decryptionWorker, encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '../testing/test-utils';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from '../services/e2ee/utils';
import DecryptionWorker from '../services/DecryptionWorker';

// Sets up clients with IDs 1 and 2, and prepares the two to sync
// encrypted resources.
const setUpTwoClientEncryptionAndSync = async () => {
	await setupDatabaseAndSynchronizer(1);
	await setupDatabaseAndSynchronizer(2);
	await switchClient(1);

	const masterKey = await loadEncryptionMasterKey();
	await setupAndEnableEncryption(encryptionService(), masterKey, '123456');
	await synchronizerStart();

	// Give both clients the same master key
	await switchClient(2);
	await synchronizerStart();

	Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
	await loadMasterKeysFromSettings(encryptionService());

	// For compatability with code that calls DecryptionWorker.instance()
	DecryptionWorker.instance_ = decryptionWorker();
};

export default setUpTwoClientEncryptionAndSync;
