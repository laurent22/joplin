"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfCanSync = exports.setMasterKeyHasBeenUsed = exports.SyncInfo = exports.setAppMinVersion = void 0;
exports.migrateLocalSyncInfo = migrateLocalSyncInfo;
exports.uploadSyncInfo = uploadSyncInfo;
exports.fetchSyncInfo = fetchSyncInfo;
exports.checkSyncTargetIsValid = checkSyncTargetIsValid;
exports.saveLocalSyncInfo = saveLocalSyncInfo;
exports.localSyncInfo = localSyncInfo;
exports.localSyncInfoFromState = localSyncInfoFromState;
exports.mergeSyncInfos = mergeSyncInfos;
exports.syncInfoEquals = syncInfoEquals;
exports.getEncryptionEnabled = getEncryptionEnabled;
exports.setEncryptionEnabled = setEncryptionEnabled;
exports.getActiveMasterKeyId = getActiveMasterKeyId;
exports.setActiveMasterKeyId = setActiveMasterKeyId;
exports.getActiveMasterKey = getActiveMasterKey;
exports.setMasterKeyEnabled = setMasterKeyEnabled;
exports.masterKeyEnabled = masterKeyEnabled;
exports.addMasterKey = addMasterKey;
exports.setPpk = setPpk;
exports.masterKeyById = masterKeyById;
const Logger_1 = require("@joplin/utils/Logger");
const Setting_1 = require("../../models/Setting");
const BaseItem_1 = require("../../models/BaseItem");
const compare_versions_1 = require("compare-versions");
const locale_1 = require("../../locale");
const JoplinError_1 = require("../../JoplinError");
const errors_1 = require("../../errors");
const fastDeepEqual = require('fast-deep-equal');
const logger = Logger_1.default.create('syncInfoUtils');
// This should be set to the client version whenever we require all the clients to be at the same
// version in order to synchronise. One example is when adding support for the trash feature - if an
// old client that doesn't know about this feature synchronises data with a new client, the notes
// will no longer be deleted on the old client.
//
// Usually this variable should be bumped whenever we add properties to a sync item.
//
// `appMinVersion_` should really just be a constant but for testing purposes it can be changed
// using `setAppMinVersion()`
let appMinVersion_ = '3.0.0';
const setAppMinVersion = (v) => {
    appMinVersion_ = v;
};
exports.setAppMinVersion = setAppMinVersion;
async function migrateLocalSyncInfo(db) {
    if (Setting_1.default.value('syncInfoCache'))
        return; // Already initialized
    // TODO: if the sync info is changed, there should be steps to migrate from
    // v3 to v4, v4 to v5, etc.
    const masterKeys = await db.selectAll('SELECT * FROM master_keys');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const masterKeyMap = {};
    for (const mk of masterKeys)
        masterKeyMap[mk.id] = mk;
    const syncInfo = new SyncInfo();
    syncInfo.version = Setting_1.default.value('syncVersion');
    syncInfo.e2ee = Setting_1.default.valueNoThrow('encryption.enabled', false);
    syncInfo.activeMasterKeyId = Setting_1.default.valueNoThrow('encryption.activeMasterKeyId', '');
    syncInfo.masterKeys = masterKeys;
    // We set the timestamp to 0 because we don't know when the source setting
    // has been set. That way, if the parameter is changed later on in any
    // client, the new value will have higher priority. This is to handle this
    // case:
    //
    // - Client 1 upgrade local sync target info (with E2EE = false)
    // - Client 1 set E2EE to true
    // - Client 2 upgrade local sync target info (with E2EE = false)
    // - => If we don't set the timestamp to 0, the local value of client 2 will
    //   have a higher timestamp and E2EE will get disabled, even though this is
    //   most likely not what the user wants.
    syncInfo.setKeyTimestamp('e2ee', 0);
    syncInfo.setKeyTimestamp('activeMasterKeyId', 0);
    await saveLocalSyncInfo(syncInfo);
}
async function uploadSyncInfo(api, syncInfo) {
    await api.put('info.json', syncInfo.serialize());
}
async function fetchSyncInfo(api) {
    const syncTargetInfoText = await api.get('info.json');
    // Returns version 0 if the sync target is empty
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    let output = { version: 0 };
    if (syncTargetInfoText) {
        output = JSON.parse(syncTargetInfoText);
        if (!output.version)
            throw new Error('Missing "version" field in info.json');
    }
    else {
        // If info.json is not present, this might be an old sync target, in
        // which case we can at least get the version number from version.txt
        const oldVersion = await api.get('.sync/version.txt');
        // Where info.json is missing, but .sync/version.txt is not, the sync target will be set as needing upgrade, and will be upgraded upon restarting the app
        // If both info.json and .sync/version.txt are missing, it can be assumed that something has gone wrong with the sync target, so do not mark as needing upgrade and raise a failsafe error if not the initial sync
        // When performing 'Delete local data and re-download from sync target' or 'Re-upload local data to sync target' actions, all sync_items are cleared down as if it were the initial sync
        if (oldVersion) {
            output = { version: 1 };
        }
        else if (!(await isInitialSync(api.syncTargetId()))) {
            throwFailsafeError();
        }
    }
    return fixSyncInfo(new SyncInfo(JSON.stringify(output)));
}
async function checkSyncTargetIsValid(api) {
    const syncTargetInfoText = await api.get('info.json');
    if (!syncTargetInfoText) {
        throwFailsafeError();
    }
}
async function isInitialSync(syncTargetId) {
    const syncedItems = await BaseItem_1.default.syncedItemIds(syncTargetId);
    return syncedItems.length === 0;
}
// This failsafe validation producing this error will be performed regardless of which sync target is selected
// Other failsafe validation is performed based on the percentage of items deleted in the "basicDelta" function
// The basicDelta is not executed for all sync target types, but the validation in this function is superior at protecting against data loss
// However it is still beneficial to keep the failsafe check which is driven by count of deleted items in place, as it can protect against deliberate deletion of all notes by the user,
// where they are not aware of the implications of 2 way sync. This is just "nice to have" though, so would not be worth adding complexity to make it work for all sync target types
function throwFailsafeError() {
    if (Setting_1.default.value('sync.wipeOutFailSafe')) {
        throw new JoplinError_1.default((0, locale_1._)('Fail-safe: Sync was interrupted to prevent data loss, because the sync target is empty or damaged. To override this behaviour disable the fail-safe in the sync settings.'), 'failSafe');
    }
}
function saveLocalSyncInfo(syncInfo) {
    Setting_1.default.setValue('syncInfoCache', syncInfo.serialize());
}
const fixSyncInfo = (syncInfo) => {
    if (syncInfo.activeMasterKeyId) {
        if (!syncInfo.masterKeys || !syncInfo.masterKeys.find(mk => mk.id === syncInfo.activeMasterKeyId)) {
            logger.warn(`Sync info is using a non-existent key as the active key - clearing it: ${syncInfo.activeMasterKeyId}`);
            syncInfo.activeMasterKeyId = '';
        }
    }
    return syncInfo;
};
function localSyncInfo() {
    const output = new SyncInfo(Setting_1.default.value('syncInfoCache'));
    output.appMinVersion = appMinVersion_;
    return fixSyncInfo(output);
}
function localSyncInfoFromState(state) {
    return new SyncInfo(state.settings['syncInfoCache']);
}
// When deciding which master key should be active we should take into account
// whether it's been used or not. If it's been used before it should most likely
// remain the active one, regardless of timestamps. This is because the extra
// key was most likely created by mistake by the user, in particular in this
// kind of scenario:
//
// - Client 1 setup sync with sync target
// - Client 1 enable encryption
// - Client 1 sync
//
// Then user 2 does the same:
//
// - Client 2 setup sync with sync target
// - Client 2 enable encryption
// - Client 2 sync
//
// The problem is that enabling encryption was not needed since it was already
// done (and recorded in info.json) on the sync target. As a result an extra key
// has been created and it has been set as the active one, but we shouldn't use
// it. Instead the key created by client 1 should be used and made active again.
//
// And we can do this using the "hasBeenUsed" field which tells us which keys
// has already been used to encrypt data. In this case, at the moment we compare
// local and remote sync info (before synchronising the data), key1.hasBeenUsed
// is true, but key2.hasBeenUsed is false.
//
// 2023-05-30: Additionally, if one key is enabled and the other is not, we
// always pick the enabled one regardless of usage.
const mergeActiveMasterKeys = (s1, s2, output) => {
    const activeMasterKey1 = getActiveMasterKey(s1);
    const activeMasterKey2 = getActiveMasterKey(s2);
    let doDefaultAction = false;
    if (activeMasterKey1 && activeMasterKey2) {
        if (masterKeyEnabled(activeMasterKey1) && !masterKeyEnabled(activeMasterKey2)) {
            output.setWithTimestamp(s1, 'activeMasterKeyId');
        }
        else if (!masterKeyEnabled(activeMasterKey1) && masterKeyEnabled(activeMasterKey2)) {
            output.setWithTimestamp(s2, 'activeMasterKeyId');
        }
        else if (activeMasterKey1.hasBeenUsed && !activeMasterKey2.hasBeenUsed) {
            output.setWithTimestamp(s1, 'activeMasterKeyId');
        }
        else if (!activeMasterKey1.hasBeenUsed && activeMasterKey2.hasBeenUsed) {
            output.setWithTimestamp(s2, 'activeMasterKeyId');
        }
        else {
            doDefaultAction = true;
        }
    }
    else {
        doDefaultAction = true;
    }
    if (doDefaultAction) {
        output.setWithTimestamp(s1.keyTimestamp('activeMasterKeyId') > s2.keyTimestamp('activeMasterKeyId') ? s1 : s2, 'activeMasterKeyId');
    }
};
// If there is a distinction, s1 should be local sync info and s2 remote.
function mergeSyncInfos(s1, s2) {
    const output = new SyncInfo();
    output.setWithTimestamp(s1.keyTimestamp('e2ee') > s2.keyTimestamp('e2ee') ? s1 : s2, 'e2ee');
    output.setWithTimestamp(s1.keyTimestamp('ppk') > s2.keyTimestamp('ppk') ? s1 : s2, 'ppk');
    output.version = s1.version > s2.version ? s1.version : s2.version;
    mergeActiveMasterKeys(s1, s2, output);
    output.masterKeys = s1.masterKeys.slice();
    for (const mk of s2.masterKeys) {
        const idx = output.masterKeys.findIndex(m => m.id === mk.id);
        if (idx < 0) {
            output.masterKeys.push(mk);
        }
        else {
            const mk2 = output.masterKeys[idx];
            output.masterKeys[idx] = mk.updated_time > mk2.updated_time ? mk : mk2;
        }
    }
    // We use >= so that the version from s1 (local) is preferred to the version in s2 (remote).
    // For example, if s2 has appMinVersion 0.00 and s1 has appMinVersion 0.0.0, we choose the
    // local version, 0.0.0.
    output.appMinVersion = (0, compare_versions_1.compareVersions)(s1.appMinVersion, s2.appMinVersion) >= 0 ? s1.appMinVersion : s2.appMinVersion;
    return output;
}
function syncInfoEquals(s1, s2) {
    return fastDeepEqual(s1.toObject(), s2.toObject());
}
class SyncInfo {
    constructor(serialized = null) {
        this.version_ = 0;
        this.masterKeys_ = [];
        this.appMinVersion_ = appMinVersion_;
        this.e2ee_ = { value: false, updatedTime: 0 };
        this.activeMasterKeyId_ = { value: '', updatedTime: 0 };
        this.ppk_ = { value: null, updatedTime: 0 };
        if (serialized)
            this.load(serialized);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    toObject() {
        return {
            version: this.version,
            e2ee: this.e2ee_,
            activeMasterKeyId: this.activeMasterKeyId_,
            masterKeys: this.masterKeys,
            ppk: this.ppk_,
            appMinVersion: this.appMinVersion,
        };
    }
    filterSyncInfo() {
        const filtered = JSON.parse(JSON.stringify(this.toObject()));
        // Filter content and checksum properties from master keys
        if (filtered.masterKeys) {
            filtered.masterKeys = filtered.masterKeys.map((mk) => {
                delete mk.content;
                delete mk.checksum;
                return mk;
            });
        }
        // Truncate the private key and public key
        if (filtered.ppk.value) {
            filtered.ppk.value.privateKey.ciphertext = `${filtered.ppk.value.privateKey.ciphertext.substr(0, 20)}...${filtered.ppk.value.privateKey.ciphertext.substr(-20)}`;
            filtered.ppk.value.publicKey = `${filtered.ppk.value.publicKey.substr(0, 40)}...`;
        }
        return filtered;
    }
    serialize() {
        return JSON.stringify(this.toObject(), null, '\t');
    }
    load(serialized) {
        // We probably should add validation after parsing at some point, but for now we are going to keep it simple
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let s = {};
        try {
            s = JSON.parse(serialized);
        }
        catch (error) {
            logger.error(`Error parsing sync info, using default values. Sync info: ${JSON.stringify(serialized)}`, error);
        }
        this.version = 'version' in s ? s.version : 0;
        this.e2ee_ = 'e2ee' in s ? s.e2ee : { value: false, updatedTime: 0 };
        this.activeMasterKeyId_ = 'activeMasterKeyId' in s ? s.activeMasterKeyId : { value: '', updatedTime: 0 };
        this.masterKeys_ = 'masterKeys' in s ? s.masterKeys : [];
        this.ppk_ = 'ppk' in s ? s.ppk : { value: null, updatedTime: 0 };
        this.appMinVersion_ = s.appMinVersion ? s.appMinVersion : '0.0.0';
        // Migration for master keys that didn't have "hasBeenUsed" property -
        // in that case we assume they've been used at least once.
        for (const mk of this.masterKeys_) {
            if (!('hasBeenUsed' in mk) || mk.hasBeenUsed === undefined) {
                mk.hasBeenUsed = true;
            }
        }
    }
    setWithTimestamp(fromSyncInfo, propName) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        if (!(propName in this))
            throw new Error(`Invalid prop name: ${propName}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this[propName] = fromSyncInfo[propName];
        this.setKeyTimestamp(propName, fromSyncInfo.keyTimestamp(propName));
    }
    get version() {
        return this.version_;
    }
    set version(v) {
        if (v === this.version_)
            return;
        this.version_ = v;
    }
    get ppk() {
        return this.ppk_.value;
    }
    set ppk(v) {
        if (v === this.ppk_.value)
            return;
        this.ppk_ = { value: v, updatedTime: Date.now() };
    }
    get e2ee() {
        return this.e2ee_.value;
    }
    set e2ee(v) {
        if (v === this.e2ee)
            return;
        this.e2ee_ = { value: v, updatedTime: Date.now() };
    }
    get appMinVersion() {
        return this.appMinVersion_;
    }
    set appMinVersion(v) {
        this.appMinVersion_ = v;
    }
    get activeMasterKeyId() {
        return this.activeMasterKeyId_.value;
    }
    set activeMasterKeyId(v) {
        if (v === this.activeMasterKeyId)
            return;
        this.activeMasterKeyId_ = { value: v, updatedTime: Date.now() };
    }
    get masterKeys() {
        return this.masterKeys_;
    }
    set masterKeys(v) {
        if (JSON.stringify(v) === JSON.stringify(this.masterKeys_))
            return;
        this.masterKeys_ = v;
    }
    keyTimestamp(name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        if (!(`${name}_` in this))
            throw new Error(`Invalid name: ${name}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return this[`${name}_`].updatedTime;
    }
    setKeyTimestamp(name, timestamp) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        if (!(`${name}_` in this))
            throw new Error(`Invalid name: ${name}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this[`${name}_`].updatedTime = timestamp;
    }
}
exports.SyncInfo = SyncInfo;
// ---------------------------------------------------------
// Shortcuts to simplify the refactoring
// ---------------------------------------------------------
function getEncryptionEnabled() {
    return localSyncInfo().e2ee;
}
function setEncryptionEnabled(v, activeMasterKeyId = '') {
    const s = localSyncInfo();
    s.e2ee = v;
    if (activeMasterKeyId)
        s.activeMasterKeyId = activeMasterKeyId;
    saveLocalSyncInfo(s);
}
function getActiveMasterKeyId() {
    return localSyncInfo().activeMasterKeyId;
}
function setActiveMasterKeyId(id) {
    const s = localSyncInfo();
    s.activeMasterKeyId = id;
    saveLocalSyncInfo(s);
}
function getActiveMasterKey(s = null) {
    s = s || localSyncInfo();
    if (!s.activeMasterKeyId)
        return null;
    return s.masterKeys.find(mk => mk.id === s.activeMasterKeyId);
}
function setMasterKeyEnabled(mkId, enabled = true) {
    const s = localSyncInfo();
    const idx = s.masterKeys.findIndex(mk => mk.id === mkId);
    if (idx < 0)
        throw new Error(`No such master key: ${mkId}`);
    // Disabled for now as it's needed to disable even the main master key when the password has been forgotten
    // https://discourse.joplinapp.org/t/syncing-error-with-joplin-cloud-and-e2ee-master-key-is-not-loaded/20115/5?u=laurent
    //
    // if (mkId === getActiveMasterKeyId() && !enabled) throw new Error('The active master key cannot be disabled');
    s.masterKeys[idx] = Object.assign(Object.assign({}, s.masterKeys[idx]), { enabled: enabled ? 1 : 0, updated_time: Date.now() });
    saveLocalSyncInfo(s);
}
const setMasterKeyHasBeenUsed = (s, mkId) => {
    const idx = s.masterKeys.findIndex(mk => mk.id === mkId);
    if (idx < 0)
        throw new Error(`No such master key: ${mkId}`);
    s.masterKeys[idx] = Object.assign(Object.assign({}, s.masterKeys[idx]), { hasBeenUsed: true, updated_time: Date.now() });
    saveLocalSyncInfo(s);
    return s;
};
exports.setMasterKeyHasBeenUsed = setMasterKeyHasBeenUsed;
function masterKeyEnabled(mk) {
    if ('enabled' in mk)
        return !!mk.enabled;
    return true;
}
function addMasterKey(syncInfo, masterKey) {
    // Sanity check - because shouldn't happen
    if (syncInfo.masterKeys.find(mk => mk.id === masterKey.id))
        throw new Error('Master key is already present');
    syncInfo.masterKeys.push(masterKey);
    saveLocalSyncInfo(syncInfo);
}
function setPpk(ppk) {
    const syncInfo = localSyncInfo();
    syncInfo.ppk = ppk;
    saveLocalSyncInfo(syncInfo);
}
function masterKeyById(id) {
    return localSyncInfo().masterKeys.find(mk => mk.id === id);
}
const checkIfCanSync = (s, appVersion) => {
    if ((0, compare_versions_1.compareVersions)(appVersion, s.appMinVersion) < 0)
        throw new JoplinError_1.default((0, locale_1._)('In order to synchronise, please upgrade your application to version %s+', s.appMinVersion), errors_1.ErrorCode.MustUpgradeApp);
};
exports.checkIfCanSync = checkIfCanSync;
