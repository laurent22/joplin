"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JoplinServerApi_1 = require("../../JoplinServerApi");
const locale_1 = require("../../locale");
const Logger_1 = require("@joplin/utils/Logger");
const Folder_1 = require("../../models/Folder");
const MasterKey_1 = require("../../models/MasterKey");
const Note_1 = require("../../models/Note");
const Setting_1 = require("../../models/Setting");
const ppk_1 = require("../e2ee/ppk/ppk");
const utils_1 = require("../e2ee/utils");
const ResourceService_1 = require("../ResourceService");
const syncInfoUtils_1 = require("../synchronizer/syncInfoUtils");
const reducer_1 = require("./reducer");
const PerformanceLogger_1 = require("../../PerformanceLogger");
const logger = Logger_1.default.create('ShareService');
const perfLogger = PerformanceLogger_1.default.create();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function formatShareInvitations(invitations) {
    return invitations.map(inv => {
        return Object.assign(Object.assign({}, inv), { master_key: inv.master_key ? JSON.parse(inv.master_key) : null });
    });
}
class ShareService {
    constructor() {
        this.api_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.store_ = null;
        this.encryptionService_ = null;
        this.initialized_ = false;
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new ShareService();
        return this.instance_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    initialize(store, encryptionService, api = null) {
        this.initialized_ = true;
        this.store_ = store;
        this.encryptionService_ = encryptionService;
        this.api_ = api;
    }
    get enabled() {
        if (!this.initialized_)
            return false;
        return [9, 10, 11].includes(Setting_1.default.value('sync.target')); // Joplin Server, Joplin Cloud targets
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    get store() {
        return this.store_;
    }
    get state() {
        return this.store.getState()[reducer_1.stateRootKey];
    }
    get userId() {
        return this.api() ? this.api().userId : '';
    }
    api() {
        if (this.api_)
            return this.api_;
        const syncTargetId = Setting_1.default.value('sync.target');
        this.api_ = new JoplinServerApi_1.default({
            baseUrl: () => Setting_1.default.value(`sync.${syncTargetId}.path`),
            userContentBaseUrl: () => Setting_1.default.value(`sync.${syncTargetId}.userContentPath`),
            username: () => Setting_1.default.value(`sync.${syncTargetId}.username`),
            password: () => Setting_1.default.value(`sync.${syncTargetId}.password`),
            session: () => {
                if (syncTargetId === 11) {
                    return {
                        id: Setting_1.default.value('sync.11.id'),
                        user_id: Setting_1.default.value('sync.11.userId'),
                    };
                }
                else {
                    return null;
                }
            },
        });
        return this.api_;
    }
    async shareFolder(folderId) {
        const folder = await Folder_1.default.load(folderId);
        if (!folder)
            throw new Error(`No such folder: ${folderId}`);
        let folderMasterKey = null;
        if ((0, syncInfoUtils_1.getEncryptionEnabled)()) {
            const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
            // Shouldn't happen
            if (!syncInfo.ppk)
                throw new Error('Cannot share notebook because E2EE is enabled and no Public Private Key pair exists.');
            // This can happen if using an outdated Joplin client, where the PPK
            // was generated on a different device with a newer PPK implementation.
            if (!(0, ppk_1.supportsPpkAlgorithm)(syncInfo.ppk)) {
                throw new Error('The local public private key pair uses an unsupported algorithm. It may be necessary to upgrade Joplin or share from a different device.');
            }
            if (folder.master_key_id) {
                logger.info(`Folder ${folderId}'s already has a master key. Not creating a new one.`);
            }
            else {
                // TODO: handle "undefinedMasterPassword" error - show master password dialog
                folderMasterKey = await this.encryptionService_.generateMasterKey((0, utils_1.getMasterPassword)());
                folderMasterKey = await MasterKey_1.default.save(folderMasterKey);
                (0, syncInfoUtils_1.addMasterKey)(syncInfo, folderMasterKey);
            }
        }
        const newFolderProps = {};
        if (folder.parent_id)
            newFolderProps.parent_id = '';
        if (folderMasterKey)
            newFolderProps.master_key_id = folderMasterKey.id;
        if (Object.keys(newFolderProps).length) {
            await Folder_1.default.save(Object.assign({ id: folder.id }, newFolderProps));
        }
        const share = await this.api().exec('POST', 'api/shares', {}, {
            folder_id: folderId,
            master_key_id: folderMasterKey ? folderMasterKey.id : '',
        });
        // Note: race condition if the share is created but the app crashes
        // before setting share_id on the folder. See unshareFolder() for info.
        await Folder_1.default.save({ id: folder.id, share_id: share.id });
        await Folder_1.default.updateAllShareIds(ResourceService_1.default.instance(), this.shares);
        return share;
    }
    // This allows the notebook owner to stop sharing it. For a recipient to
    // leave the shared notebook, see the leaveSharedFolder command.
    async unshareFolder(folderId) {
        const folder = await Folder_1.default.load(folderId);
        if (!folder)
            throw new Error(`No such folder: ${folderId}`);
        const share = this.shares.find(s => s.folder_id === folderId);
        if (!share)
            throw new Error(`No share for folder: ${folderId}`);
        // First, delete the share - which in turns is going to remove the items
        // for all users, except the owner.
        await this.deleteShare(share.id);
        // Clear the master_key_id so that the folder uses a new master key if
        // shared again.
        // TODO: Remove the now-unused master key from local sync info.
        await Folder_1.default.save({ id: folderId, master_key_id: '' });
        // Then reset the "share_id" field for the folder and all sub-items.
        // This could potentially be done server-side, when deleting the share,
        // but since clients are normally responsible for maintaining the
        // share_id property, we do it here for consistency. It will also avoid
        // conflicts because changes will come only from the clients.
        //
        // Note that there could be a race condition here if the share is
        // deleted, but the app crashes just before setting share_id to "". It's
        // very unlikely to happen so we leave like this for now.
        //
        // We could potentially have a clean up process at some point:
        //
        // - It would download all share objects
        // - Then look for all items where the share_id is not in any of these
        //   shares objects
        // - And set those to ""
        //
        // Likewise, it could apply the share_id to folders based on
        // share.folder_id
        //
        // Setting the share_id is not critical - what matters is that when the
        // share is deleted, other users no longer have access to the item, so
        // can't change or read them.
        await Folder_1.default.save({ id: folder.id, share_id: '' });
        // It's ok if updateAllShareIds() doesn't run because it's executed on
        // each sync too.
        await Folder_1.default.updateAllShareIds(ResourceService_1.default.instance(), this.shares);
    }
    // This is when a share recipient decides to leave the shared folder.
    //
    // In that case we delete the root folder. Deleting the folder tells the
    // server that we want to leave the share.
    //
    // We also immediately delete the children, but we do not sync the changes
    // otherwise it would delete the items for other users too.
    //
    // If we do not delete them now it would also cause all kind of issues with
    // read-only shares, because the read-only status will be lost after the
    // deletion of the root folder, which means various services may modify the
    // data. The changes will then be rejected by the sync target and cause
    // conflicts.
    //
    // We do not need to sync the children deletion, because the server will
    // take care of deleting all associated user_items. So eventually all the
    // notebook content will also be deleted for the current user.
    //
    // If `folderShareUserId` is provided, the function will check that the user
    // does not own the share. It would be an error to leave such a folder
    // (instead "unshareFolder" should be called).
    async leaveSharedFolder(folderId, folderShareUserId = null) {
        if (folderShareUserId !== null) {
            const userId = Setting_1.default.value('sync.userId');
            if (folderShareUserId === userId)
                throw new Error('Cannot leave own notebook');
        }
        const folder = await Folder_1.default.load(folderId);
        // We call this to make sure all items are correctly linked before we
        // call deleteAllByShareId()
        await Folder_1.default.updateAllShareIds(ResourceService_1.default.instance(), this.shares);
        const source = 'ShareService.leaveSharedFolder';
        await Folder_1.default.delete(folderId, { deleteChildren: false, disableReadOnlyCheck: true, sourceDescription: source });
        await Folder_1.default.deleteAllByShareId(folder.share_id, { disableReadOnlyCheck: true, trackDeleted: false, sourceDescription: source });
    }
    // Finds any folder that is associated with a share, but the user no longer
    // has access to the share, and remove these folders. This check is
    // necessary otherwise sync will try to update items that are not longer
    // accessible and will throw the error "Could not find share with ID: xxxx")
    async checkShareConsistency() {
        const rootSharedFolders = await Folder_1.default.rootSharedFolders(this.shares);
        let hasRefreshedShares = false;
        let shares = this.shares;
        for (const folder of rootSharedFolders) {
            let share = shares.find(s => s.id === folder.share_id);
            if (!share && !hasRefreshedShares) {
                shares = await this.refreshShares();
                share = shares.find(s => s.id === folder.share_id);
                hasRefreshedShares = true;
            }
            if (!share) {
                // This folder is a associated with a share, but the user no
                // longer has access to this share. It can happen for two
                // reasons:
                //
                // - It no longer exists
                // - Or the user rejected that share from a different device,
                //   and the folder was not deleted as it should have been.
                //
                // In that case we need to leave the notebook.
                logger.warn(`Found a folder that was associated with a share, but the user not longer has access to the share - leaving the folder. Folder: ${folder.title} (${folder.id}). Share: ${folder.share_id}`);
                await this.leaveSharedFolder(folder.id);
            }
        }
    }
    async shareNote(noteId, recursive) {
        const note = await Note_1.default.load(noteId);
        if (!note)
            throw new Error(`No such note: ${noteId}`);
        const share = await this.api().exec('POST', 'api/shares', {}, {
            note_id: noteId,
            recursive: recursive ? 1 : 0,
        });
        await Note_1.default.save({
            id: note.id,
            parent_id: note.parent_id,
            is_shared: 1,
            updated_time: Date.now(),
        }, {
            autoTimestamp: false,
        });
        return share;
    }
    async unshareNote(noteId) {
        const note = await Note_1.default.load(noteId);
        if (!note)
            throw new Error(`No such note: ${noteId}`);
        const shares = await this.refreshShares();
        const noteShares = shares.filter(s => s.note_id === noteId);
        const promises = [];
        for (const share of noteShares) {
            promises.push(this.deleteShare(share.id));
        }
        await Promise.all(promises);
        await Note_1.default.save({
            id: note.id,
            parent_id: note.parent_id,
            is_shared: 0,
            updated_time: Date.now(),
        }, {
            autoTimestamp: false,
        });
    }
    shareUrl(userId, share) {
        return `${this.api().personalizedUserContentBaseUrl(userId)}/shares/${share.id}`;
    }
    folderShare(folderId) {
        return this.shares.find(s => s.folder_id === folderId);
    }
    isSharedFolderOwner(folderId, userId = null) {
        if (userId === null)
            userId = this.userId;
        const share = this.folderShare(folderId);
        if (!share)
            throw new Error(`Cannot find share associated with folder: ${folderId}`);
        return share.user.id === userId;
    }
    get shares() {
        return this.state.shares;
    }
    get shareLinkNoteIds() {
        return this.shares.filter(s => !!s.note_id).map(s => s.note_id);
    }
    get shareInvitations() {
        return this.state.shareInvitations;
    }
    async userPublicKey(userEmail) {
        return await this.api().exec('GET', `api/users/${encodeURIComponent(userEmail)}/public_key`);
    }
    async addShareRecipient(shareId, masterKeyId, recipientEmail, permissions) {
        let recipientMasterKey = null;
        if ((0, syncInfoUtils_1.getEncryptionEnabled)()) {
            if (!recipientEmail)
                throw new Error((0, locale_1._)('Please provide the recipient email'));
            const syncInfo = (0, syncInfoUtils_1.localSyncInfo)();
            const masterKey = syncInfo.masterKeys.find(m => m.id === masterKeyId);
            if (!masterKey)
                throw new Error(`Cannot find master key with ID "${masterKeyId}"`);
            const recipientPublicKey = await this.userPublicKey(recipientEmail);
            if (!recipientPublicKey)
                throw new Error((0, locale_1._)('Cannot share encrypted notebook with recipient %s because they have not enabled end-to-end encryption. They may do so from the screen Configuration > Encryption.', recipientEmail));
            logger.info('Reencrypting master key with recipient public key', recipientPublicKey);
            recipientMasterKey = await (0, ppk_1.mkReencryptFromPasswordToPublicKey)(this.encryptionService_, masterKey, (0, utils_1.getMasterPassword)(), recipientPublicKey);
        }
        return this.api().exec('POST', `api/shares/${shareId}/users`, {}, Object.assign({ email: recipientEmail, master_key: JSON.stringify(recipientMasterKey) }, permissions));
    }
    async deleteShareRecipient(shareUserId) {
        await this.api().exec('DELETE', `api/share_users/${shareUserId}`);
    }
    async deleteShare(shareId) {
        await this.api().exec('DELETE', `api/shares/${shareId}`);
    }
    async loadShares() {
        return this.api().exec('GET', 'api/shares');
    }
    async loadShareUsers(shareId) {
        return this.api().exec('GET', `api/shares/${shareId}/users`);
    }
    async loadShareInvitations() {
        return this.api().exec('GET', 'api/share_users');
    }
    setProcessingShareInvitationResponse(v) {
        this.store.dispatch({
            type: 'SHARE_INVITATION_RESPONSE_PROCESSING',
            value: v,
        });
    }
    async setPermissions(shareId, shareUserId, permissions) {
        logger.info('setPermissions: ', shareUserId, permissions);
        await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, {
            can_read: 1,
            can_write: permissions.can_write,
        });
        this.store.dispatch({
            type: 'SHARE_USER_UPDATE_ONE',
            shareId: shareId,
            shareUser: Object.assign({ id: shareUserId }, permissions),
        });
    }
    async respondInvitation(shareUserId, masterKey, accept) {
        logger.info('respondInvitation: ', shareUserId, accept);
        if (accept) {
            if (masterKey) {
                const getReEncryptedKey = async (ppkCandidates) => {
                    let lastError = null;
                    for (const ppk of ppkCandidates) {
                        lastError = null;
                        try {
                            return await (0, ppk_1.mkReencryptFromPublicKeyToPassword)(this.encryptionService_, masterKey, ppk, (0, utils_1.getMasterPassword)(), (0, utils_1.getMasterPassword)());
                        }
                        catch (error) {
                            logger.warn('Failed to decrypt master key. Has the public key been migrated since the item was shared? Error:', error);
                            lastError = error;
                        }
                    }
                    throw lastError;
                };
                // The invitation's masterKey may be encrypted with either the current PPK or a PPK from
                // before a recent migration. Check the old PPK to prevent the sharer from having to
                // create a new invitation just after the recipient runs a migration.
                const ppkCandidates = [(0, syncInfoUtils_1.localSyncInfo)().ppk];
                const cachedPpk = Setting_1.default.value('encryption.cachedPpk');
                if ('ppk' in cachedPpk) {
                    ppkCandidates.push(cachedPpk.ppk);
                }
                const reencryptedMasterKey = await getReEncryptedKey(ppkCandidates);
                logger.info('respondInvitation: Key has been reencrypted using master password', reencryptedMasterKey);
                await MasterKey_1.default.save(reencryptedMasterKey);
            }
            await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 1 });
        }
        else {
            await this.api().exec('PATCH', `api/share_users/${shareUserId}`, null, { status: 2 });
        }
    }
    async refreshShareInvitations() {
        const result = await this.loadShareInvitations();
        const invitations = formatShareInvitations(result.items);
        logger.info('Refresh share invitations:', invitations);
        this.store.dispatch({
            type: 'SHARE_INVITATION_SET',
            shareInvitations: invitations,
        });
    }
    async shareById(id) {
        const stateShare = this.state.shares.find(s => s.id === id);
        if (stateShare)
            return stateShare;
        const refreshedShares = await this.refreshShares();
        const refreshedShare = refreshedShares.find(s => s.id === id);
        if (!refreshedShare)
            throw new Error(`Could not find share with ID: ${id}`);
        return refreshedShare;
    }
    // In most cases the share objects will already be part of the state, so
    // this function checks there first. If the required share objects are not
    // present, it refreshes them from the API.
    async sharesByIds(ids) {
        const buildOutput = async (shares) => {
            const output = {};
            for (const share of shares) {
                if (ids.includes(share.id))
                    output[share.id] = share;
            }
            return output;
        };
        let output = await buildOutput(this.state.shares);
        if (Object.keys(output).length === ids.length)
            return output;
        const refreshedShares = await this.refreshShares();
        output = await buildOutput(refreshedShares);
        if (Object.keys(output).length !== ids.length) {
            logger.error('sharesByIds: Need:', ids);
            logger.error('sharesByIds: Got:', Object.keys(refreshedShares));
            throw new Error('Could not retrieve required share objects');
        }
        return output;
    }
    async refreshShares() {
        const result = await this.loadShares();
        logger.info('Refreshed shares:', result);
        this.store.dispatch({
            type: 'SHARE_SET',
            shares: result.items,
        });
        return result.items;
    }
    async refreshShareUsers(shareId) {
        const result = await this.loadShareUsers(shareId);
        logger.info('Refreshed share users:', result);
        this.store.dispatch({
            type: 'SHARE_USER_SET',
            shareId: shareId,
            shareUsers: result.items,
        });
    }
    async updateNoLongerSharedItems() {
        const shareIds = this.shares.map(share => share.id).concat(this.shareInvitations.map(si => si.share.id));
        await Folder_1.default.updateNoLongerSharedItems(shareIds);
    }
    async maintenance() {
        const task = perfLogger.taskStart('ShareService/maintenance');
        if (this.enabled) {
            let hasError = false;
            try {
                await this.refreshShareInvitations();
            }
            catch (error) {
                hasError = true;
                logger.error('Maintenance: Failed to update share invitations:', error);
            }
            try {
                await this.refreshShares();
            }
            catch (error) {
                hasError = true;
                logger.error('Maintenance: Failed to refresh shares:', error);
            }
            Setting_1.default.setValue('sync.userId', this.api().userId);
            // If there was no errors, it means we have all the share objects,
            // so we can run the clean up function.
            if (!hasError)
                await this.updateNoLongerSharedItems();
        }
        task.onEnd();
    }
}
exports.default = ShareService;
