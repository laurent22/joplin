"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const object_1 = require("@joplin/utils/object");
const BaseModel_1 = require("../../BaseModel");
const getConflictFolderId_1 = require("../../models/utils/getConflictFolderId");
const getTrashFolderId_1 = require("./getTrashFolderId");
const isTrashableItem = (itemType, item) => {
    (0, object_1.checkObjectHasProperties)(item, ['id']);
    if (itemType !== BaseModel_1.ModelType.Folder && itemType !== BaseModel_1.ModelType.Note) {
        return false;
    }
    return item.id !== (0, getConflictFolderId_1.default)() && item.id !== (0, getTrashFolderId_1.default)();
};
exports.default = isTrashableItem;
