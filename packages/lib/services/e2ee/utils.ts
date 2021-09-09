import Logger from '../../Logger';
import BaseItem from '../../models/BaseItem';
import MasterKey from '../../models/MasterKey';
import Setting from '../../models/Setting';
import { MasterKeyEntity } from './types';
import EncryptionService from './EncryptionService';
import { getActiveMasterKey, getActiveMasterKeyId, masterKeyEnabled, setEncryptionEnabled, SyncInfo } from '../synchronizer/syncInfoUtils';

const logger = Logger.create('e2ee/utils');

export async function setupAndEnableEncryption(service: EncryptionService, masterKey: MasterKeyEntity = null, masterPassword: string = null) {
	if (!masterKey) {
		// May happen for example if there are master keys in info.json but none
		// of them is set as active. But in fact, unless there is a bug in the
		// application, this shouldn't happen.
		logger.warn('Setting up E2EE without a master key - user will need to either generate one or select one of the existing ones as active');
	}

	setEncryptionEnabled(true, masterKey ? masterKey.id : null);

	if (masterPassword) {
		Setting.setValue('encryption.masterPassword', masterPassword);
	}

	// Mark only the non-encrypted ones for sync since, if there are encrypted ones,
	// it means they come from the sync target and are already encrypted over there.
	await BaseItem.markAllNonEncryptedForSync();

	await loadMasterKeysFromSettings(service);
}

export async function setupAndDisableEncryption(service: EncryptionService) {
	// Allow disabling encryption even if some items are still encrypted, because whether E2EE is enabled or disabled
	// should not affect whether items will enventually be decrypted or not (DecryptionWorker will still work as
	// long as there are encrypted items). Also even if decryption is disabled, it's possible that encrypted items
	// will still be received via synchronisation.

	setEncryptionEnabled(false);

	// The only way to make sure everything gets decrypted on the sync target is
	// to re-sync everything.
	await BaseItem.forceSyncAll();

	await loadMasterKeysFromSettings(service);
}

export async function toggleAndSetupEncryption(service: EncryptionService, enabled: boolean, masterKey: MasterKeyEntity, password: string) {
	logger.info('toggleAndSetupEncryption: enabled:', enabled, ' Master key', masterKey);

	if (!enabled) {
		await setupAndDisableEncryption(service);
	} else {
		if (masterKey) {
			await setupAndEnableEncryption(service, masterKey, password);
		} else {
			await generateMasterKeyAndEnableEncryption(EncryptionService.instance(), password);
		}
	}

	await loadMasterKeysFromSettings(service);
}

export async function generateMasterKeyAndEnableEncryption(service: EncryptionService, password: string) {
	let masterKey = await service.generateMasterKey(password);
	masterKey = await MasterKey.save(masterKey);
	await setupAndEnableEncryption(service, masterKey, password);
	await loadMasterKeysFromSettings(service);
	return masterKey;
}

// Migration function to initialise the master password. Normally it is set when
// enabling E2EE, but previously it wasn't. So here we check if the password is
// set. If it is not, we set it from the active master key. It needs to be
// called after the settings have been initialized.
export async function migrateMasterPassword() {
	if (Setting.value('encryption.masterPassword')) return; // Already migrated

	logger.info('Master password is not set - trying to get it from the active master key...');

	const mk = getActiveMasterKey();
	if (!mk) return;

	const masterPassword = Setting.value('encryption.passwordCache')[mk.id];
	if (masterPassword) {
		Setting.setValue('encryption.masterPassword', masterPassword);
		logger.info('Master password is now set.');

		// Also clear the key passwords that match the master password to avoid
		// any confusion.
		const cache = Setting.value('encryption.passwordCache');
		const newCache = { ...cache };
		for (const [mkId, password] of Object.entries(cache)) {
			if (password === masterPassword) {
				delete newCache[mkId];
			}
		}
		Setting.setValue('encryption.passwordCache', newCache);
		await Setting.saveAll();
	}
}

// All master keys normally should be decryped with the master password, however
// previously any master key could be encrypted with any password, so to support
// this legacy case, we first check if the MK decrypts with the master password.
// If not, try with the master key specific password, if any is defined.
export async function findMasterKeyPassword(service: EncryptionService, masterKey: MasterKeyEntity): Promise<string> {
	const masterPassword = Setting.value('encryption.masterPassword');
	if (masterPassword && await service.checkMasterKeyPassword(masterKey, masterPassword)) {
		logger.info('findMasterKeyPassword: Using master password');
		return masterPassword;
	}

	logger.info('findMasterKeyPassword: No master password is defined - trying to get master key specific password');

	const passwords = Setting.value('encryption.passwordCache');
	return passwords[masterKey.id];
}

export async function loadMasterKeysFromSettings(service: EncryptionService) {
	const masterKeys = await MasterKey.all();
	const activeMasterKeyId = getActiveMasterKeyId();

	logger.info(`Trying to load ${masterKeys.length} master keys...`);

	for (let i = 0; i < masterKeys.length; i++) {
		const mk = masterKeys[i];
		if (service.isMasterKeyLoaded(mk)) continue;

		const password = await findMasterKeyPassword(service, mk);
		if (!password) continue;

		try {
			await service.loadMasterKey(mk, password, activeMasterKeyId === mk.id);
		} catch (error) {
			logger.warn(`Cannot load master key ${mk.id}. Invalid password?`, error);
		}
	}

	logger.info(`Loaded master keys: ${service.loadedMasterKeysCount()}`);
}

export function showMissingMasterKeyMessage(syncInfo: SyncInfo, notLoadedMasterKeys: string[]) {
	if (!syncInfo.masterKeys.length) return false;

	notLoadedMasterKeys = notLoadedMasterKeys.slice();

	for (let i = notLoadedMasterKeys.length - 1; i >= 0; i--) {
		const mk = syncInfo.masterKeys.find(mk => mk.id === notLoadedMasterKeys[i]);

		// A "notLoadedMasterKey" is a key that either doesn't exist or for
		// which a password hasn't been set yet. For the purpose of this
		// function, we only want to notify the user about unset passwords.
		// Master keys that haven't been downloaded yet should normally be
		// downloaded at some point.
		// https://github.com/laurent22/joplin/issues/5391
		if (!mk) continue;
		if (!masterKeyEnabled(mk)) notLoadedMasterKeys.pop();
	}

	return !!notLoadedMasterKeys.length;
}

export function getDefaultMasterKey(): MasterKeyEntity {
	let mk = getActiveMasterKey();
	if (!mk || masterKeyEnabled(mk)) {
		mk = MasterKey.latest();
	}
	return mk && masterKeyEnabled(mk) ? mk : null;
}
