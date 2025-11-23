"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const BaseItem_1 = require("../../models/BaseItem");
const BaseModel_1 = require("../../BaseModel");
const Resource_1 = require("../../models/Resource");
const Folder_1 = require("../../models/Folder");
const NoteTag_1 = require("../../models/NoteTag");
const Note_1 = require("../../models/Note");
const Tag_1 = require("../../models/Tag");
const { sprintf } = require('sprintf-js');
const shim_1 = require("../../shim");
const { fileExtension } = require('../../path-utils');
const uuid_1 = require("../../uuid");
class InteropService_Importer_Raw extends InteropService_Importer_Base_1.default {
    async exec(result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const itemIdMap = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const createdResources = {};
        const noteTagsToCreate = [];
        const destinationFolderId = this.options_.destinationFolderId;
        const replaceLinkedItemIds = async (noteBody) => {
            let output = noteBody;
            const itemIds = Note_1.default.linkedItemIds(noteBody);
            for (let i = 0; i < itemIds.length; i++) {
                const id = itemIds[i];
                if (!itemIdMap[id])
                    itemIdMap[id] = uuid_1.default.create();
                output = output.replace(new RegExp(id, 'gi'), itemIdMap[id]);
            }
            return output;
        };
        const stats = await shim_1.default.fsDriver().readDirStats(this.sourcePath_);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const folderExists = function (stats, folderId) {
            folderId = folderId.toLowerCase();
            for (let i = 0; i < stats.length; i++) {
                const stat = stats[i];
                const statId = BaseItem_1.default.pathToId(stat.path);
                if (statId.toLowerCase() === folderId)
                    return true;
            }
            return false;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        let defaultFolder_ = null;
        const defaultFolder = async () => {
            if (defaultFolder_)
                return defaultFolder_;
            const folderTitle = await Folder_1.default.findUniqueItemTitle(this.options_.defaultFolderTitle ? this.options_.defaultFolderTitle : 'Imported', '');
            // eslint-disable-next-line require-atomic-updates
            defaultFolder_ = await Folder_1.default.save({ title: folderTitle });
            return defaultFolder_;
        };
        const setFolderToImportTo = async (itemParentId) => {
            // Logic is a bit complex here:
            // - If a destination folder was specified, move the note to it.
            // - Otherwise, if the associated folder exists, use this.
            // - If it doesn't exist, use the default folder. This is the case for example when importing JEX archives that contain only one or more notes, but no folder.
            const itemParentExists = folderExists(stats, itemParentId);
            if (!itemIdMap[itemParentId]) {
                if (destinationFolderId) {
                    itemIdMap[itemParentId] = destinationFolderId;
                }
                else if (!itemParentExists) {
                    const parentFolder = await defaultFolder();
                    // eslint-disable-next-line require-atomic-updates
                    itemIdMap[itemParentId] = parentFolder.id;
                }
                else {
                    itemIdMap[itemParentId] = uuid_1.default.create();
                }
            }
        };
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            try {
                if (stat.isDirectory())
                    continue;
                if (fileExtension(stat.path).toLowerCase() !== 'md')
                    continue;
                const content = await shim_1.default.fsDriver().readFile(`${this.sourcePath_}/${stat.path}`);
                const item = await BaseItem_1.default.unserialize(content);
                const itemType = item.type_;
                const ItemClass = BaseItem_1.default.itemClass(item);
                delete item.type_;
                if (itemType === BaseModel_1.default.TYPE_NOTE) {
                    await setFolderToImportTo(item.parent_id);
                    if (!itemIdMap[item.id])
                        itemIdMap[item.id] = uuid_1.default.create();
                    item.id = itemIdMap[item.id];
                    item.parent_id = itemIdMap[item.parent_id];
                    item.body = await replaceLinkedItemIds(item.body);
                }
                else if (itemType === BaseModel_1.default.TYPE_FOLDER) {
                    if (destinationFolderId)
                        continue;
                    if (!itemIdMap[item.id])
                        itemIdMap[item.id] = uuid_1.default.create();
                    item.id = itemIdMap[item.id];
                    if (item.parent_id) {
                        await setFolderToImportTo(item.parent_id);
                        item.parent_id = itemIdMap[item.parent_id];
                    }
                    item.title = await Folder_1.default.findUniqueItemTitle(item.title, item.parent_id);
                }
                else if (itemType === BaseModel_1.default.TYPE_RESOURCE) {
                    const sourceId = item.id;
                    if (!itemIdMap[item.id])
                        itemIdMap[item.id] = uuid_1.default.create();
                    item.id = itemIdMap[item.id];
                    createdResources[item.id] = item;
                    const sourceResourcePath = `${this.sourcePath_}/resources/${Resource_1.default.filename(Object.assign(Object.assign({}, item), { id: sourceId }))}`;
                    const destPath = Resource_1.default.fullPath(item);
                    if (await shim_1.default.fsDriver().exists(sourceResourcePath)) {
                        await shim_1.default.fsDriver().copy(sourceResourcePath, destPath);
                    }
                    else {
                        result.warnings.push(sprintf('Could not find resource file: %s', sourceResourcePath));
                    }
                }
                else if (itemType === BaseModel_1.default.TYPE_TAG) {
                    const tag = await Tag_1.default.loadByTitle(item.title);
                    if (tag) {
                        itemIdMap[item.id] = tag.id;
                        continue;
                    }
                    const tagId = uuid_1.default.create();
                    itemIdMap[item.id] = tagId;
                    item.id = tagId;
                }
                else if (itemType === BaseModel_1.default.TYPE_NOTE_TAG) {
                    noteTagsToCreate.push(item);
                    continue;
                }
                await ItemClass.save(item, { isNew: true, autoTimestamp: false });
            }
            catch (error) {
                error.message = `Could not import: ${stat.path}: ${error.message}`;
                throw error;
            }
        }
        for (let i = 0; i < noteTagsToCreate.length; i++) {
            const noteTag = noteTagsToCreate[i];
            const newNoteId = itemIdMap[noteTag.note_id];
            const newTagId = itemIdMap[noteTag.tag_id];
            if (!newNoteId) {
                result.warnings.push(sprintf('Non-existent note %s referenced in tag %s', noteTag.note_id, noteTag.tag_id));
                continue;
            }
            if (!newTagId) {
                result.warnings.push(sprintf('Non-existent tag %s for note %s', noteTag.tag_id, noteTag.note_id));
                continue;
            }
            noteTag.id = uuid_1.default.create();
            noteTag.note_id = newNoteId;
            noteTag.tag_id = newTagId;
            await NoteTag_1.default.save(noteTag, { isNew: true });
        }
        return result;
    }
}
exports.default = InteropService_Importer_Raw;
