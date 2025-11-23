"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemIsReadOnly = exports.itemIsReadOnlySync = exports.checkIfItemCanBeAddedToFolder = exports.checkIfItemCanBeChanged = exports.checkIfItemsCanBeChanged = exports.needsShareReadOnlyChecks = void 0;
const Logger_1 = require("@joplin/utils/Logger");
const BaseModel_1 = require("../../BaseModel");
const errors_1 = require("../../errors");
const JoplinError_1 = require("../../JoplinError");
const ItemChange_1 = require("../ItemChange");
const Setting_1 = require("../Setting");
const object_1 = require("@joplin/utils/object");
const isTrashableItem_1 = require("../../services/trash/isTrashableItem");
const logger = Logger_1.default.create('models/utils/readOnly');
// This function can be called to wrap code that related to share permission read-only checks. It
// should be fast and allows an early exit for cases that don't apply, for example if not
// synchronising with Joplin Cloud or if not sharing any notebook.
const needsShareReadOnlyChecks = (itemType, changeSource, shareState, disableReadOnlyCheck = false) => {
    if (disableReadOnlyCheck)
        return false;
    if (Setting_1.default.value('sync.target') !== 10)
        return false;
    if (changeSource === ItemChange_1.default.SOURCE_SYNC)
        return false;
    if (!Setting_1.default.value('sync.userId'))
        return false;
    if (![BaseModel_1.ModelType.Note, BaseModel_1.ModelType.Folder, BaseModel_1.ModelType.Resource].includes(itemType))
        return false;
    if (!shareState)
        throw new Error('Share state must be provided');
    if (!shareState.shareInvitations.length)
        return false;
    return true;
};
exports.needsShareReadOnlyChecks = needsShareReadOnlyChecks;
const checkIfItemsCanBeChanged = (itemType, changeSource, items, shareState) => {
    for (const item of items) {
        (0, exports.checkIfItemCanBeChanged)(itemType, changeSource, item, shareState);
    }
};
exports.checkIfItemsCanBeChanged = checkIfItemsCanBeChanged;
const checkIfItemCanBeChanged = (itemType, changeSource, item, shareState) => {
    if (!(0, exports.needsShareReadOnlyChecks)(itemType, changeSource, shareState))
        return;
    if (!item)
        return;
    if ((0, exports.itemIsReadOnlySync)(itemType, changeSource, item, Setting_1.default.value('sync.userId'), shareState, true)) {
        throw new JoplinError_1.default(`Cannot change or delete a read-only item: ${item.id}`, errors_1.ErrorCode.IsReadOnly);
    }
};
exports.checkIfItemCanBeChanged = checkIfItemCanBeChanged;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const checkIfItemCanBeAddedToFolder = async (itemType, Folder, changeSource, shareState, parentId) => {
    if ((0, exports.needsShareReadOnlyChecks)(itemType, changeSource, shareState) && parentId) {
        const parentFolder = await Folder.load(parentId, { fields: ['id', 'share_id'] });
        if (!parentFolder) {
            // Historically it's always been possible to set the parent_id of a
            // note to a folder that does not exist - this is to support
            // synchronisation, where items are downloaded in random order. It
            // is not ideal to skip the check here, but if for some reason the
            // folder turns out to be read-only the issue will be resolved
            // during sync.
            logger.warn('checkIfItemCanBeAddedToFolder: Trying to add an item to a folder that does not exist - skipping check');
            return;
        }
        if ((0, exports.itemIsReadOnlySync)(itemType, changeSource, parentFolder, Setting_1.default.value('sync.userId'), shareState, true)) {
            throw new JoplinError_1.default('Cannot add an item as a child of a read-only item', errors_1.ErrorCode.IsReadOnly);
        }
    }
};
exports.checkIfItemCanBeAddedToFolder = checkIfItemCanBeAddedToFolder;
// Originally all these functions were there to handle share permissions - a note, folder or
// resource that is not editable would be read-only. However this particular function now is also
// used to tell if a note is read-only because it is in the trash.
//
// But this requires access to more properties, `deleted_time` in particular, which are not needed
// for share-related checks (and does not exist on Resource objects). So this is why there's this
// extra `sharePermissionCheckOnly` boolean to do the check for one case or the other. A bit of a
// hack but good enough for now.
const itemIsReadOnlySync = (itemType, changeSource, item, userId, shareState, sharePermissionCheckOnly = false) => {
    var _a;
    if (!sharePermissionCheckOnly && (0, isTrashableItem_1.default)(itemType, item)) {
        (0, object_1.checkObjectHasProperties)(item, ['deleted_time']);
    }
    // Item is in trash
    if (!sharePermissionCheckOnly && item.deleted_time)
        return true;
    if (!(0, exports.needsShareReadOnlyChecks)(itemType, changeSource, shareState))
        return false;
    (0, object_1.checkObjectHasProperties)(item, ['share_id']);
    // Item is not shared
    if (!item.share_id)
        return false;
    // Item belongs to the user
    const parentShare = shareState.shares.find(s => s.id === item.share_id);
    if (parentShare && ((_a = parentShare.user) === null || _a === void 0 ? void 0 : _a.id) === userId)
        return false;
    const shareUser = shareState.shareInvitations.find(si => si.share.id === item.share_id);
    // Shouldn't happen
    if (!shareUser)
        return false;
    return !shareUser.can_write;
};
exports.itemIsReadOnlySync = itemIsReadOnlySync;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const itemIsReadOnly = async (BaseItem, itemType, changeSource, itemId, userId, shareState) => {
    // if (!needsShareReadOnlyChecks(itemType, changeSource, shareState)) return false;
    const item = await BaseItem.loadItem(itemType, itemId, { fields: ['id', 'share_id', 'deleted_time'] });
    if (!item)
        throw new JoplinError_1.default(`No such item: ${itemType}: ${itemId}`, errors_1.ErrorCode.NotFound);
    return (0, exports.itemIsReadOnlySync)(itemType, changeSource, item, userId, shareState);
};
exports.itemIsReadOnly = itemIsReadOnly;
