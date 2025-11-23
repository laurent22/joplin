"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterPasswordStatus = exports.activeMasterKeySanityCheck = exports.migratePpk = void 0;
exports.setupAndEnableEncryption = setupAndEnableEncryption;
exports.setupAndDisableEncryption = setupAndDisableEncryption;
exports.toggleAndSetupEncryption = toggleAndSetupEncryption;
exports.generateMasterKeyAndEnableEncryption = generateMasterKeyAndEnableEncryption;
exports.migrateMasterPassword = migrateMasterPassword;
exports.findMasterKeyPassword = findMasterKeyPassword;
exports.loadMasterKeysFromSettings = loadMasterKeysFromSettings;
exports.showMissingMasterKeyMessage = showMissingMasterKeyMessage;
exports.getDefaultMasterKey = getDefaultMasterKey;
exports.getMasterPassword = getMasterPassword;
exports.updateMasterPassword = updateMasterPassword;
exports.resetMasterPassword = resetMasterPassword;
exports.getMasterPasswordStatus = getMasterPasswordStatus;
exports.checkHasMasterPasswordEncryptedData = checkHasMasterPasswordEncryptedData;
exports.getMasterPasswordStatusMessage = getMasterPasswordStatusMessage;
exports.masterPasswordIsValid = masterPasswordIsValid;
exports.masterKeysWithoutPassword = masterKeysWithoutPassword;
const Logger_1 = require("@joplin/utils/Logger");
const BaseItem_1 = require("../../models/BaseItem");
const MasterKey_1 = require("../../models/MasterKey");
const Setting_1 = require("../../models/Setting");
const EncryptionService_1 = require("./EncryptionService");
const syncInfoUtils_1 = require("../synchronizer/syncInfoUtils");
const JoplinError_1 = require("../../JoplinError");
const ppk_1 = require("./ppk/ppk");
const Folder_1 = require("../../models/Folder");
const logger = Logger_1.default.create('e2ee/utils');
async function setupAndEnableEncryption(service, masterKey = null, masterPassword = null) {
    if (!masterKey) {
        // May happen for example if there are master keys in info.json but none
        // of them is set as active. But in fact, unless there is a bug in the
        // application, this shouldn't happen.
        logger.warn('Setting up E2EE without a master key - user will need to either generate one or select one of the existing ones as active');
    }
    (0, syncInfoUtils_1.setEncryptionEnabled)(true, masterKey ? masterKey.id : null);
    if (masterPassword) {
        Setting_1.default.setValue('encryption.masterPassword', masterPassword);
    }
    // Mark only the non-encrypted ones for sync since, if there are encrypted ones,
    // it means they come from the sync target and are already encrypted over there.
    await BaseItem_1.default.markAllNonEncryptedForSync();
    await loadMasterKeysFromSettings(service);
}
async function setupAndDisableEncryption(service) {
    // Allow disabling encryption even if some items are still encrypted, because whether E2EE is enabled or disabled
    // should not affect whether items will eventually be decrypted or not (DecryptionWorker will still work as
    // long as there are encrypted items). Also even if decryption is disabled, it's possible that encrypted items
    // will still be received via synchronisation.
    (0, syncInfoUtils_1.setEncryptionEnabled)(false);
    // The only way to make sure everything gets decrypted on the sync target is
    // to re-sync everything.
    await BaseItem_1.default.forceSyncAll();
    await loadMasterKeysFromSettings(service);
}
async function toggleAndSetupEncryption(service, enabled, masterKey, password) {
    logger.info('toggleAndSetupEncryption: enabled:', enabled, ' Master key', masterKey);
    if (!enabled) {
        await setupAndDisableEncryption(service);
    }
    else {
        if (masterKey) {
            await setupAndEnableEncryption(service, masterKey, password);
        }
        else {
            await generateMasterKeyAndEnableEncryption(EncryptionService_1.default.instance(), password);
        }
    }
    await loadMasterKeysFromSettings(service);
}
async function generateMasterKeyAndEnableEncryption(service, password) {
    let masterKey = await service.generateMasterKey(password);
    masterKey = await MasterKey_1.default.save(masterKey);
    await setupAndEnableEncryption(service, masterKey, password);
    await loadMasterKeysFromSettings(service);
    return masterKey;
}
// Migration function to initialise the master password. Normally it is set when
// enabling E2EE, but previously it wasn't. So here we check if the password is
// set. If it is not, we set it from the active master key. It needs to be
// called after the settings have been initialized.
async function migrateMasterPassword() {
    // Already migrated
    if (Setting_1.default.value('encryption.masterPassword'))
        return;
    // If a PPK is defined it means the master password has been set at some
    // point so no need to run the migration
    if ((0, syncInfoUtils_1.localSyncInfo)().ppk)
        return;
    // If a PPK is defined it means the master password has been set at some
    // point so no need to run the migration
    if ((0, syncInfoUtils_1.localSyncInfo)().ppk)
        return;
    logger.info('Master password is not set - trying to get it from the active master key...');
    const mk = (0, syncInfoUtils_1.getActiveMasterKey)();
    if (!mk)
        return;
    const masterPassword = Setting_1.default.value('encryption.passwordCache')[mk.id];
    if (masterPassword) {
        Setting_1.default.setValue('encryption.masterPassword', masterPassword);
        logger.info('Master password is now set.');
        // Also clear the key passwords that match the master password to avoid
        // any confusion.
        const cache = Setting_1.default.value('encryption.passwordCache');
        const newCache = Object.assign({}, cache);
        for (const [mkId, password] of Object.entries(cache)) {
            if (password === masterPassword) {
                delete newCache[mkId];
            }
        }
        Setting_1.default.setValue('encryption.passwordCache', newCache);
        await Setting_1.default.saveAll();
    }
}
const migratePpk = async () => {
    const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
    const ppk = syncInfo.ppk;
    if (!ppk || !(0, ppk_1.shouldUpdatePpk)(ppk))
        return;
    const password = getMasterPassword(false);
    if (!password)
        return;
    logger.info('Migrating PPK');
    // Cache the previous PPK locally. If a share was created with the old public key,
    // the user should still be able to accept it (even if the old public key
    // is no longer published).
    Setting_1.default.setValue('encryption.cachedPpk', { ppk, timestamp: Date.now() });
    syncInfo.ppk = await (0, ppk_1.generateKeyPair)(EncryptionService_1.default.instance(), password);
    (0, syncInfoUtils_1.saveLocalSyncInfo)(syncInfo);
};
exports.migratePpk = migratePpk;
// All master keys normally should be decrypted with the master password, however
// previously any master key could be encrypted with any password, so to support
// this legacy case, we first check if the MK decrypts with the master password.
// If not, try with the master key specific password, if any is defined.
async function findMasterKeyPassword(service, masterKey, passwordCache = null) {
    const masterPassword = Setting_1.default.value('encryption.masterPassword');
    if (masterPassword && await service.checkMasterKeyPassword(masterKey, masterPassword)) {
        logger.info('findMasterKeyPassword: Using master password');
        return masterPassword;
    }
    logger.info('findMasterKeyPassword: No master password is defined - trying to get master key specific password');
    const passwords = passwordCache ? passwordCache : Setting_1.default.value('encryption.passwordCache');
    return passwords[masterKey.id];
}
async function loadMasterKeysFromSettings(service) {
    (0, exports.activeMasterKeySanityCheck)();
    const masterKeys = await MasterKey_1.default.all();
    const activeMasterKeyId = (0, syncInfoUtils_1.getActiveMasterKeyId)();
    logger.info(`Trying to load ${masterKeys.length} master keys...`);
    for (let i = 0; i < masterKeys.length; i++) {
        const mk = masterKeys[i];
        if (service.isMasterKeyLoaded(mk))
            continue;
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
const activeMasterKeySanityCheck = () => {
    const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
    const activeMasterKeyId = syncInfo.activeMasterKeyId;
    const enabledMasterKeys = syncInfo.masterKeys.filter(mk => (0, syncInfoUtils_1.masterKeyEnabled)(mk));
    if (!enabledMasterKeys.length)
        return;
    if (enabledMasterKeys.find(mk => mk.id === activeMasterKeyId)) {
        logger.info('activeMasterKeySanityCheck: Active key is an enabled key - nothing to do');
        return;
    }
    logger.info('activeMasterKeySanityCheck: Active key is **not** an enabled key - selecting a different key as the active key...');
    const latestMasterKey = enabledMasterKeys.reduce((acc, current) => {
        if (current.created_time > acc.created_time) {
            return current;
        }
        else {
            return acc;
        }
    });
    logger.info('activeMasterKeySanityCheck: Selected new active key:', latestMasterKey);
    (0, syncInfoUtils_1.setActiveMasterKeyId)(latestMasterKey.id);
};
exports.activeMasterKeySanityCheck = activeMasterKeySanityCheck;
function showMissingMasterKeyMessage(syncInfo, notLoadedMasterKeys) {
    if (!syncInfo.masterKeys.length)
        return false;
    notLoadedMasterKeys = notLoadedMasterKeys.slice();
    for (let i = notLoadedMasterKeys.length - 1; i >= 0; i--) {
        const mk = syncInfo.masterKeys.find(mk => mk.id === notLoadedMasterKeys[i]);
        // A "notLoadedMasterKey" is a key that either doesn't exist or for
        // which a password hasn't been set yet. For the purpose of this
        // function, we only want to notify the user about unset passwords.
        // Master keys that haven't been downloaded yet should normally be
        // downloaded at some point.
        // https://github.com/laurent22/joplin/issues/5391
        if (!mk)
            continue;
        if (!(0, syncInfoUtils_1.masterKeyEnabled)(mk))
            notLoadedMasterKeys.pop();
    }
    return !!notLoadedMasterKeys.length;
}
function getDefaultMasterKey() {
    let mk = (0, syncInfoUtils_1.getActiveMasterKey)();
    if (!mk || (0, syncInfoUtils_1.masterKeyEnabled)(mk)) {
        mk = MasterKey_1.default.latest();
    }
    return mk && (0, syncInfoUtils_1.masterKeyEnabled)(mk) ? mk : null;
}
// Get the master password if set, or throw an exception. This ensures that
// things aren't accidentally encrypted with an empty string. Calling code
// should look for "undefinedMasterPassword" code and prompt for password.
function getMasterPassword(throwIfNotSet = true) {
    const password = Setting_1.default.value('encryption.masterPassword');
    if (!password && throwIfNotSet)
        throw new JoplinError_1.default('Master password is not set', 'undefinedMasterPassword');
    return password;
}
// - If both a current and new password is provided, and they are different, it
//   means the password is being changed, so all the keys are reencrypted with
//   the new password.
// - If the current password is not provided, the master password is simply set
//   according to newPassword.
async function updateMasterPassword(currentPassword, newPassword) {
    if (!newPassword)
        throw new Error('New password must be set');
    if (currentPassword && !(await masterPasswordIsValid(currentPassword)))
        throw new Error('Master password is not valid. Please try again.');
    const needToReencrypt = !!currentPassword && !!newPassword && currentPassword !== newPassword;
    if (needToReencrypt) {
        const reencryptedMasterKeys = [];
        let reencryptedPpk = null;
        for (const mk of (0, syncInfoUtils_1.localSyncInfo)().masterKeys) {
            try {
                reencryptedMasterKeys.push(await EncryptionService_1.default.instance().reencryptMasterKey(mk, currentPassword, newPassword));
            }
            catch (error) {
                if (!(0, syncInfoUtils_1.masterKeyEnabled)(mk))
                    continue; // Ignore if the master key is disabled, because the password is probably forgotten
                error.message = `Key ${mk.id} could not be reencrypted - this is most likely due to an incorrect password. Please try again. Error was: ${error.message}`;
                throw error;
            }
        }
        if ((0, syncInfoUtils_1.localSyncInfo)().ppk) {
            try {
                reencryptedPpk = await (0, ppk_1.pkReencryptPrivateKey)(EncryptionService_1.default.instance(), (0, syncInfoUtils_1.localSyncInfo)().ppk, currentPassword, newPassword);
            }
            catch (error) {
                error.message = `Private key could not be reencrypted - this is most likely due to an incorrect password. Please try again. Error was: ${error.message}`;
                throw error;
            }
        }
        for (const mk of reencryptedMasterKeys) {
            await MasterKey_1.default.save(mk);
        }
        if (reencryptedPpk) {
            const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
            syncInfo.ppk = reencryptedPpk;
            (0, syncInfoUtils_1.saveLocalSyncInfo)(syncInfo);
        }
    }
    else {
        if (!currentPassword && !(await masterPasswordIsValid(newPassword)))
            throw new Error('Master password is not valid. Please try again.');
    }
    Setting_1.default.setValue('encryption.masterPassword', newPassword);
}
const unshareEncryptedFolders = async (shareService, masterKeyId) => {
    const rootFolders = await Folder_1.default.rootShareFoldersByKeyId(masterKeyId);
    for (const folder of rootFolders) {
        const isOwner = shareService.isSharedFolderOwner(folder.id);
        if (isOwner) {
            await shareService.unshareFolder(folder.id);
        }
        else {
            await shareService.leaveSharedFolder(folder.id);
        }
    }
};
async function resetMasterPassword(encryptionService, kvStore, shareService, newPassword) {
    // First thing we do is to unshare all shared folders. If that fails, which
    // may happen in particular if no connection is available, then we don't
    // proceed. `unshareEncryptedFolders` will throw if something cannot be
    // done.
    if (shareService) {
        for (const mk of (0, syncInfoUtils_1.localSyncInfo)().masterKeys) {
            if (!(0, syncInfoUtils_1.masterKeyEnabled)(mk))
                continue;
            await unshareEncryptedFolders(shareService, mk.id);
        }
    }
    for (const mk of (0, syncInfoUtils_1.localSyncInfo)().masterKeys) {
        if (!(0, syncInfoUtils_1.masterKeyEnabled)(mk))
            continue;
        mk.enabled = 0;
        await MasterKey_1.default.save(mk);
    }
    const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
    if (syncInfo.ppk) {
        await kvStore.setValue(`oldppk::${Date.now()}`, JSON.stringify(syncInfo.ppk));
        syncInfo.ppk = await (0, ppk_1.generateKeyPair)(encryptionService, newPassword);
        (0, syncInfoUtils_1.saveLocalSyncInfo)(syncInfo);
    }
    Setting_1.default.setValue('encryption.masterPassword', newPassword);
    const masterKey = await encryptionService.generateMasterKey(newPassword);
    await MasterKey_1.default.save(masterKey);
    await loadMasterKeysFromSettings(encryptionService);
}
var MasterPasswordStatus;
(function (MasterPasswordStatus) {
    MasterPasswordStatus[MasterPasswordStatus["Unknown"] = 0] = "Unknown";
    MasterPasswordStatus[MasterPasswordStatus["Loaded"] = 1] = "Loaded";
    MasterPasswordStatus[MasterPasswordStatus["NotSet"] = 2] = "NotSet";
    MasterPasswordStatus[MasterPasswordStatus["Invalid"] = 3] = "Invalid";
    MasterPasswordStatus[MasterPasswordStatus["Valid"] = 4] = "Valid";
})(MasterPasswordStatus || (exports.MasterPasswordStatus = MasterPasswordStatus = {}));
async function getMasterPasswordStatus(password = null) {
    password = password === null ? getMasterPassword(false) : password;
    if (!password)
        return MasterPasswordStatus.NotSet;
    const isValid = await masterPasswordIsValid(password);
    return isValid ? MasterPasswordStatus.Valid : MasterPasswordStatus.Invalid;
}
async function checkHasMasterPasswordEncryptedData(syncInfo = null) {
    syncInfo = syncInfo ? syncInfo : (0, syncInfoUtils_1.localSyncInfo)();
    return !!syncInfo.ppk || !!syncInfo.masterKeys.length;
}
const masterPasswordStatusMessages = {
    [MasterPasswordStatus.Unknown]: 'Checking...',
    [MasterPasswordStatus.Loaded]: 'Loaded',
    [MasterPasswordStatus.NotSet]: 'Not set',
    [MasterPasswordStatus.Valid]: '✓ ' + 'Valid',
    [MasterPasswordStatus.Invalid]: '❌ ' + 'Invalid',
};
function getMasterPasswordStatusMessage(status) {
    return masterPasswordStatusMessages[status];
}
async function masterPasswordIsValid(masterPassword, activeMasterKey = null) {
    // A valid password is basically one that decrypts the private key, but due
    // to backward compatibility not all users have a PPK yet, so we also check
    // based on the active master key.
    if (!masterPassword)
        throw new Error('Password is empty');
    const ppk = (0, syncInfoUtils_1.localSyncInfo)().ppk;
    if (ppk) {
        return (0, ppk_1.ppkPasswordIsValid)(EncryptionService_1.default.instance(), ppk, masterPassword);
    }
    const masterKey = activeMasterKey ? activeMasterKey : getDefaultMasterKey();
    if (masterKey) {
        return EncryptionService_1.default.instance().checkMasterKeyPassword(masterKey, masterPassword);
    }
    // If the password has never been set, then whatever password is provided is considered valid.
    if (!Setting_1.default.value('encryption.masterPassword'))
        return true;
    // There may not be any key to decrypt if the master password has been set,
    // but the user has never synchronized. In which case, it's sufficient to
    // compare to whatever they've entered earlier.
    return Setting_1.default.value('encryption.masterPassword') === masterPassword;
}
async function masterKeysWithoutPassword() {
    const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
    const passwordCache = Setting_1.default.value('encryption.passwordCache');
    const output = [];
    for (const mk of syncInfo.masterKeys) {
        if (!(0, syncInfoUtils_1.masterKeyEnabled)(mk))
            continue;
        const password = await findMasterKeyPassword(EncryptionService_1.default.instance(), mk, passwordCache);
        if (!password)
            output.push(mk.id);
    }
    return output;
}
