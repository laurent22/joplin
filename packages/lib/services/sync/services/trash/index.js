"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrashFolderId = exports.getRestoreFolder = exports.itemIsInTrash = exports.getTrashFolderIcon = exports.getTrashFolder = exports.getTrashFolderTitle = exports.getDisplayParentTitle = exports.getDisplayParentId = void 0;
const object_1 = require("@joplin/utils/object");
const BaseModel_1 = require("../../BaseModel");
const locale_1 = require("../../locale");
const types_1 = require("../database/types");
const Folder_1 = require("../../models/Folder");
const getTrashFolderId_1 = require("./getTrashFolderId");
exports.getTrashFolderId = getTrashFolderId_1.default;
// When an item is deleted, all its properties are kept, including the parent ID
// so that it can potentially be restored to the right folder. However, when
// displaying that item, we should make sure it has the right parent, which may
// be different from the parent ID. For example, if we delete a note, the new
// parent is the trash folder. If we delete a folder, the folder parent is the
// trash folder, while the note parents are still the folder (since it is in the
// trash too).
//
// This function simplifies this logic wherever it is needed.
//
// `originalItemParent` is the parent before the item was deleted, which is the
// folder with ID = item.parent_id
const getDisplayParentId = (item, originalItemParent) => {
    if (!('parent_id' in item))
        throw new Error(`Missing "parent_id" property: ${JSON.stringify(item)}`);
    if (!('deleted_time' in item)) {
        throw new Error(`Missing "deleted_time" property: ${JSON.stringify(item)}`);
    }
    if (originalItemParent && !('deleted_time' in originalItemParent)) {
        throw new Error(`Missing "deleted_time" property: ${JSON.stringify(originalItemParent)}`);
    }
    if (!item.deleted_time)
        return item.parent_id;
    if (!originalItemParent || !originalItemParent.deleted_time)
        return (0, getTrashFolderId_1.default)();
    return item.parent_id;
};
exports.getDisplayParentId = getDisplayParentId;
const getDisplayParentTitle = (item, originalItemParent) => {
    const displayParentId = (0, exports.getDisplayParentId)(item, originalItemParent);
    if (displayParentId === (0, getTrashFolderId_1.default)())
        return (0, exports.getTrashFolderTitle)();
    return originalItemParent && originalItemParent.id === displayParentId ? originalItemParent.title : '';
};
exports.getDisplayParentTitle = getDisplayParentTitle;
const getTrashFolderTitle = () => {
    return (0, locale_1._)('Trash');
};
exports.getTrashFolderTitle = getTrashFolderTitle;
const getTrashFolder = () => {
    const now = Date.now();
    return {
        type_: BaseModel_1.ModelType.Folder,
        id: (0, getTrashFolderId_1.default)(),
        parent_id: '',
        title: (0, exports.getTrashFolderTitle)(),
        updated_time: now,
        user_updated_time: now,
        share_id: '',
        is_shared: 0,
        deleted_time: 0,
    };
};
exports.getTrashFolder = getTrashFolder;
const getTrashFolderIcon = (type) => {
    if (type === types_1.FolderIconType.FontAwesome) {
        return {
            dataUrl: '',
            emoji: '',
            name: 'fas fa-trash',
            type: types_1.FolderIconType.FontAwesome,
        };
    }
    else {
        return {
            dataUrl: '',
            emoji: '🗑️',
            name: '',
            type: types_1.FolderIconType.Emoji,
        };
    }
};
exports.getTrashFolderIcon = getTrashFolderIcon;
const itemIsInTrash = (item) => {
    if (!item)
        return false;
    (0, object_1.checkObjectHasProperties)(item, ['id', 'deleted_time']);
    return item.id === (0, getTrashFolderId_1.default)() || !!item.deleted_time;
};
exports.itemIsInTrash = itemIsInTrash;
const getRestoreFolder = async () => {
    const title = (0, locale_1._)('Restored items');
    const output = await Folder_1.default.loadByTitleAndParent(title, '');
    if (output)
        return output;
    return Folder_1.default.save({ title });
};
exports.getRestoreFolder = getRestoreFolder;
