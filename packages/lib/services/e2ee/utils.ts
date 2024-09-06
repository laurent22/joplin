import Logger from '@joplin/utils/Logger';
import BaseItem from '../../models/BaseItem';
import MasterKey from '../../models/MasterKey';
import Setting from '../../models/Setting';
import { MasterKeyEntity } from './types';
import EncryptionService from './EncryptionService';
import { getActiveMasterKey, getActiveMasterKeyId, localSyncInfo, masterKeyEnabled, saveLocalSyncInfo, setActiveMasterKeyId, setEncryptionEnabled, SyncInfo } from '../synchronizer/syncInfoUtils';
import JoplinError from '../../JoplinError';
import { generateKeyPair, pkReencryptPrivateKey, ppkPasswordIsValid } from './ppk';
import KvStore from '../KvStore';
import Folder from '../../models/Folder';
import ShareService from '../share/ShareService';

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
	// should not affect whether items will eventually be decrypted or not (DecryptionWorker will still work as
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
	// Already migrated
	if (Setting.value('encryption.masterPassword')) return;

	// If a PPK is defined it means the master password has been set at some
	// point so no need to run the migration
	if (localSyncInfo().ppk) return;

	// If a PPK is defined it means the master password has been set at some
	// point so no need to run the migration
	if (localSyncInfo().ppk) return;

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

// All master keys normally should be decrypted with the master password, however
// previously any master key could be encrypted with any password, so to support
// this legacy case, we first check if the MK decrypts with the master password.
// If not, try with the master key specific password, if any is defined.
export async function findMasterKeyPassword(service: EncryptionService, masterKey: MasterKeyEntity, passwordCache: Record<string, string> = null): Promise<string> {
	const masterPassword = Setting.value('encryption.masterPassword');
	if (masterPassword && await service.checkMasterKeyPassword(masterKey, masterPassword)) {
		logger.info('findMasterKeyPassword: Using master password');
		return masterPassword;
	}

	logger.info('findMasterKeyPassword: No master password is defined - trying to get master key specific password');

	const passwords = passwordCache ? passwordCache : Setting.value('encryption.passwordCache');
	return passwords[masterKey.id];
}

export async function loadMasterKeysFromSettings(service: EncryptionService) {
	activeMasterKeySanityCheck();

	const masterKeys = await MasterKey.all();
	const activeMasterKeyId = getActiveMasterKeyId();

	logger.info(`Trying to load ${masterKeys.length} master keys...`);

	for (let i = 0; i < masterKeys.length; i++) {
		const mk = masterKeys[i];
		if (service.isMasterKeyLoaded(mk)) continue;

		await service.loadMasterKey(mk, async () => {
			const password = await findMasterKeyPassword(service, mk);
			return password;
		}, activeMasterKeyId === mk.id);
	}

	logger.info(`Loaded master keys: ${service.loadedMasterKeysCount()}`);
}

// In some rare cases (normally should no longer be possible), a disabled master
// key end up being the active one (the one used to encrypt data). This sanity
// check resolves this by making an enabled key the active one.
export const activeMasterKeySanityCheck = () => {
	const syncInfo = localSyncInfo();
	const activeMasterKeyId = syncInfo.activeMasterKeyId;
	const enabledMasterKeys = syncInfo.masterKeys.filter(mk => masterKeyEnabled(mk));
	if (!enabledMasterKeys.length) return;

	if (enabledMasterKeys.find(mk => mk.id === activeMasterKeyId)) {
		logger.info('activeMasterKeySanityCheck: Active key is an enabled key - nothing to do');
		return;
	}

	logger.info('activeMasterKeySanityCheck: Active key is **not** an enabled key - selecting a different key as the active key...');

	const latestMasterKey = enabledMasterKeys.reduce((acc: MasterKeyEntity, current: MasterKeyEntity) => {
		if (current.created_time > acc.created_time) {
			return current;
		} else {
			return acc;
		}
	});

	logger.info('activeMasterKeySanityCheck: Selected new active key:', latestMasterKey);

	setActiveMasterKeyId(latestMasterKey.id);
};

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

// Get the master password if set, or throw an exception. This ensures that
// things aren't accidentally encrypted with an empty string. Calling code
// should look for "undefinedMasterPassword" code and prompt for password.
export function getMasterPassword(throwIfNotSet = true): string {
	const password = Setting.value('encryption.masterPassword');
	if (!password && throwIfNotSet) throw new JoplinError('Master password is not set', 'undefinedMasterPassword');
	return password;
}

// - If both a current and new password is provided, and they are different, it
//   means the password is being changed, so all the keys are reencrypted with
//   the new password.
// - If the current password is not provided, the master password is simply set
//   according to newPassword.
export async function updateMasterPassword(currentPassword: string, newPassword: string) {
	if (!newPassword) throw new Error('New password must be set');

	if (currentPassword && !(await masterPasswordIsValid(currentPassword))) throw new Error('Master password is not valid. Please try again.');

	const needToReencrypt = !!currentPassword && !!newPassword && currentPassword !== newPassword;

	if (needToReencrypt) {
		const reencryptedMasterKeys: MasterKeyEntity[] = [];
		let reencryptedPpk = null;

		for (const mk of localSyncInfo().masterKeys) {
			try {
				reencryptedMasterKeys.push(await EncryptionService.instance().reencryptMasterKey(mk, currentPassword, newPassword));
			} catch (error) {
				if (!masterKeyEnabled(mk)) continue; // Ignore if the master key is disabled, because the password is probably forgotten
				error.message = `Key ${mk.id} could not be reencrypted - this is most likely due to an incorrect password. Please try again. Error was: ${error.message}`;
				throw error;
			}
		}

		if (localSyncInfo().ppk) {
			try {
				reencryptedPpk = await pkReencryptPrivateKey(EncryptionService.instance(), localSyncInfo().ppk, currentPassword, newPassword);
			} catch (error) {
				error.message = `Private key could not be reencrypted - this is most likely due to an incorrect password. Please try again. Error was: ${error.message}`;
				throw error;
			}
		}

		for (const mk of reencryptedMasterKeys) {
			await MasterKey.save(mk);
		}

		if (reencryptedPpk) {
			const syncInfo = localSyncInfo();
			syncInfo.ppk = reencryptedPpk;
			saveLocalSyncInfo(syncInfo);
		}
	} else {
		if (!currentPassword && !(await masterPasswordIsValid(newPassword))) throw new Error('Master password is not valid. Please try again.');
	}

	Setting.setValue('encryption.masterPassword', newPassword);
}

const unshareEncryptedFolders = async (shareService: ShareService, masterKeyId: string) => {
	const rootFolders = await Folder.rootShareFoldersByKeyId(masterKeyId);
	for (const folder of rootFolders) {
		const isOwner = shareService.isSharedFolderOwner(folder.id);
		if (isOwner) {
			await shareService.unshareFolder(folder.id);
		} else {
			await shareService.leaveSharedFolder(folder.id);
		}
	}
};

export async function resetMasterPassword(encryptionService: EncryptionService, kvStore: KvStore, shareService: ShareService, newPassword: string) {
	// First thing we do is to unshare all shared folders. If that fails, which
	// may happen in particular if no connection is available, then we don't
	// proceed. `unshareEncryptedFolders` will throw if something cannot be
	// done.
	if (shareService) {
		for (const mk of localSyncInfo().masterKeys) {
			if (!masterKeyEnabled(mk)) continue;
			await unshareEncryptedFolders(shareService, mk.id);
		}
	}

	for (const mk of localSyncInfo().masterKeys) {
		if (!masterKeyEnabled(mk)) continue;
		mk.enabled = 0;
		await MasterKey.save(mk);
	}

	const syncInfo = localSyncInfo();
	if (syncInfo.ppk) {
		await kvStore.setValue(`oldppk::${Date.now()}`, JSON.stringify(syncInfo.ppk));
		syncInfo.ppk = await generateKeyPair(encryptionService, newPassword);
		saveLocalSyncInfo(syncInfo);
	}

	Setting.setValue('encryption.masterPassword', newPassword);

	const masterKey = await encryptionService.generateMasterKey(newPassword);
	await MasterKey.save(masterKey);
	await loadMasterKeysFromSettings(encryptionService);
}

export enum MasterPasswordStatus {
	Unknown = 0,
	Loaded = 1,
	NotSet = 2,
	Invalid = 3,
	Valid = 4,
}

export async function getMasterPasswordStatus(password: string = null): Promise<MasterPasswordStatus> {
	password = password === null ? getMasterPassword(false) : password;
	if (!password) return MasterPasswordStatus.NotSet;

	const isValid = await masterPasswordIsValid(password);
	return isValid ? MasterPasswordStatus.Valid : MasterPasswordStatus.Invalid;
}

export async function checkHasMasterPasswordEncryptedData(syncInfo: SyncInfo = null): Promise<boolean> {
	syncInfo = syncInfo ? syncInfo : localSyncInfo();
	return !!syncInfo.ppk || !!syncInfo.masterKeys.length;
}

const masterPasswordStatusMessages = {
	[MasterPasswordStatus.Unknown]: 'Checking...',
	[MasterPasswordStatus.Loaded]: 'Loaded',
	[MasterPasswordStatus.NotSet]: 'Not set',
	[MasterPasswordStatus.Valid]: '✓ ' + 'Valid',
	[MasterPasswordStatus.Invalid]: '❌ ' + 'Invalid',
};

export function getMasterPasswordStatusMessage(status: MasterPasswordStatus): string {
	return masterPasswordStatusMessages[status];
}

export async function masterPasswordIsValid(masterPassword: string, activeMasterKey: MasterKeyEntity = null): Promise<boolean> {
	// A valid password is basically one that decrypts the private key, but due
	// to backward compatibility not all users have a PPK yet, so we also check
	// based on the active master key.

	if (!masterPassword) throw new Error('Password is empty');

	const ppk = localSyncInfo().ppk;
	if (ppk) {
		return ppkPasswordIsValid(EncryptionService.instance(), ppk, masterPassword);
	}

	const masterKey = activeMasterKey ? activeMasterKey : getDefaultMasterKey();
	if (masterKey) {
		return EncryptionService.instance().checkMasterKeyPassword(masterKey, masterPassword);
	}

	// If the password has never been set, then whatever password is provided is considered valid.
	if (!Setting.value('encryption.masterPassword')) return true;

	// There may not be any key to decrypt if the master password has been set,
	// but the user has never synchronized. In which case, it's sufficient to
	// compare to whatever they've entered earlier.
	return Setting.value('encryption.masterPassword') === masterPassword;
}

export async function masterKeysWithoutPassword(): Promise<string[]> {
	const syncInfo = localSyncInfo();
	const passwordCache = Setting.value('encryption.passwordCache');

	const output: string[] = [];
	for (const mk of syncInfo.masterKeys) {
		if (!masterKeyEnabled(mk)) continue;
		const password = await findMasterKeyPassword(EncryptionService.instance(), mk, passwordCache);
		if (!password) output.push(mk.id);
	}

	return output;
}
