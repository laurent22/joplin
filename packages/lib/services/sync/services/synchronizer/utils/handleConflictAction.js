"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const BaseItem_1 = require("../../../models/BaseItem");
const ItemChange_1 = require("../../../models/ItemChange");
const Note_1 = require("../../../models/Note");
const Resource_1 = require("../../../models/Resource");
const time_1 = require("../../../time");
const types_1 = require("./types");
const logger = Logger_1.default.create('handleConflictAction');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
exports.default = async (action, ItemClass, remoteExists, remoteContent, local, syncTargetId, itemIsReadOnly, dispatch) => {
    if (!types_1.conflictActions.includes(action))
        return;
    logger.debug(`Handling conflict: ${action}`);
    logger.debug('local:', local, 'remoteContent', remoteContent);
    logger.debug('remoteExists:', remoteExists);
    if (action === types_1.SyncAction.ItemConflict) {
        // ------------------------------------------------------------------------------
        // For non-note conflicts, we take the remote version (i.e. the version that was
        // synced first) and overwrite the local content.
        // ------------------------------------------------------------------------------
        if (remoteExists) {
            local = remoteContent;
            const syncTimeQueries = BaseItem_1.default.updateSyncTimeQueries(syncTargetId, local, time_1.default.unixMs(), remoteContent.updated_time);
            await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange_1.default.SOURCE_SYNC, nextQueries: syncTimeQueries });
        }
        else {
            // If the item is a folder, avoid deleting child notes and folders, as this could cause massive data loss where this conflict happens unexpectedly
            await ItemClass.delete(local.id, {
                changeSource: ItemChange_1.default.SOURCE_SYNC,
                sourceDescription: 'sync: handleConflictAction: non-note conflict',
                trackDeleted: false,
                deleteChildren: false,
            });
        }
    }
    else if (action === types_1.SyncAction.NoteConflict) {
        // ------------------------------------------------------------------------------
        // First find out if the conflict matters. For example, if the conflict is on the title or body
        // we want to preserve all the changes. If it's on todo_completed it doesn't really matter
        // so in this case we just take the remote content.
        // ------------------------------------------------------------------------------
        let mustHandleConflict = true;
        if (!itemIsReadOnly && remoteContent) {
            mustHandleConflict = Note_1.default.mustHandleConflict(local, remoteContent);
        }
        // ------------------------------------------------------------------------------
        // Create a duplicate of local note into Conflicts folder
        // (to preserve the user's changes)
        // ------------------------------------------------------------------------------
        if (mustHandleConflict) {
            await Note_1.default.createConflictNote(local, ItemChange_1.default.SOURCE_SYNC);
        }
    }
    else if (action === types_1.SyncAction.ResourceConflict) {
        if (!remoteContent || Resource_1.default.mustHandleConflict(local, remoteContent)) {
            await Resource_1.default.createConflictResourceNote(local);
            if (remoteExists) {
                // The local content we have is no longer valid and should be re-downloaded
                await Resource_1.default.setLocalState(local.id, {
                    fetch_status: Resource_1.default.FETCH_STATUS_IDLE,
                });
            }
            dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: local.id });
        }
    }
    if ([types_1.SyncAction.NoteConflict, types_1.SyncAction.ResourceConflict].includes(action)) {
        // ------------------------------------------------------------------------------
        // For note and resource conflicts, the creation of the conflict item is done
        // differently. However the way the local content is handled is the same.
        // Either copy the remote content to local or, if the remote content has
        // been deleted, delete the local content.
        // ------------------------------------------------------------------------------
        if (remoteExists) {
            local = remoteContent;
            const syncTimeQueries = BaseItem_1.default.updateSyncTimeQueries(syncTargetId, local, time_1.default.unixMs(), remoteContent.updated_time);
            await ItemClass.save(local, { autoTimestamp: false, changeSource: ItemChange_1.default.SOURCE_SYNC, nextQueries: syncTimeQueries });
            if (local.encryption_applied)
                dispatch({ type: 'SYNC_GOT_ENCRYPTED_ITEM' });
        }
        else {
            // Remote no longer exists (note deleted) so delete local one too
            await ItemClass.delete(local.id, {
                changeSource: ItemChange_1.default.SOURCE_SYNC,
                trackDeleted: false,
                sourceDescription: 'sync: handleConflictAction: note/resource conflict',
            });
        }
    }
};
