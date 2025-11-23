"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../../../BaseModel");
const BaseItem_1 = require("../../../models/BaseItem");
const ItemChange_1 = require("../../../models/ItemChange");
const Resource_1 = require("../../../models/Resource");
const time_1 = require("../../../time");
const resourceRemotePath_1 = require("./resourceRemotePath");
const types_1 = require("./types");
exports.default = async (syncTargetId, cancelling, logSyncOperation, apiCall, dispatch) => {
    const deletedItems = await BaseItem_1.default.deletedItems(syncTargetId);
    for (let i = 0; i < deletedItems.length; i++) {
        if (cancelling)
            break;
        const item = deletedItems[i];
        const path = BaseItem_1.default.systemPath(item.item_id);
        const isResource = item.item_type === BaseModel_1.default.TYPE_RESOURCE;
        try {
            await apiCall('delete', path);
            if (isResource) {
                const remoteContentPath = (0, resourceRemotePath_1.default)(item.item_id);
                await apiCall('delete', remoteContentPath);
            }
            logSyncOperation(types_1.SyncAction.DeleteRemote, null, { id: item.item_id }, 'local has been deleted');
        }
        catch (error) {
            if (error.code === 'isReadOnly') {
                let remoteContent = await apiCall('get', path);
                if (remoteContent) {
                    remoteContent = await BaseItem_1.default.unserialize(remoteContent);
                    const ItemClass = BaseItem_1.default.itemClass(item.item_type);
                    // For remote deletion, remoteItemUpdatedTime can be reset to 0
                    let nextQueries = BaseItem_1.default.updateSyncTimeQueries(syncTargetId, remoteContent, time_1.default.unixMs());
                    if (isResource) {
                        nextQueries = nextQueries.concat(Resource_1.default.setLocalStateQueries(remoteContent.id, {
                            fetch_status: Resource_1.default.FETCH_STATUS_IDLE,
                        }));
                    }
                    await ItemClass.save(remoteContent, { isNew: true, autoTimestamp: false, changeSource: ItemChange_1.default.SOURCE_SYNC, nextQueries });
                    if (isResource)
                        dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: remoteContent.id });
                }
            }
            else {
                throw error;
            }
        }
        await BaseItem_1.default.remoteDeletedItem(syncTargetId, item.item_id);
    }
};
