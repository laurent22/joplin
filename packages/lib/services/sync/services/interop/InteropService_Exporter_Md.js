"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
const BaseModel_1 = require("../../BaseModel");
const shim_1 = require("../../shim");
const markdownUtils_1 = require("../../markdownUtils");
const Folder_1 = require("../../models/Folder");
const Note_1 = require("../../models/Note");
const path_utils_1 = require("../../path-utils");
const renderer_1 = require("@joplin/renderer");
class InteropService_Exporter_Md extends InteropService_Exporter_Base_1.default {
    async init(destDir) {
        this.destDir_ = destDir;
        this.resourceDir_ = destDir ? `${destDir}/_resources` : null;
        this.createdDirs_ = [];
        await shim_1.default.fsDriver().mkdir(this.destDir_);
        await shim_1.default.fsDriver().mkdir(this.resourceDir_);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async makeDirPath_(item, pathPart = null, findUniqueFilename = true) {
        let output = '';
        while (true) {
            if (item.type_ === BaseModel_1.default.TYPE_FOLDER) {
                if (pathPart) {
                    output = `${pathPart}/${output}`;
                }
                else {
                    output = `${(0, path_utils_1.friendlySafeFilename)(item.title, null)}/${output}`;
                    if (findUniqueFilename)
                        output = await shim_1.default.fsDriver().findUniqueFilename(output, null, true);
                }
            }
            if (!item.parent_id)
                return output;
            item = await Folder_1.default.load(item.parent_id);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async replaceLinkedItemIdsByRelativePaths_(item) {
        const relativePathToRoot = await this.makeDirPath_(item, '..');
        const newBody = await this.replaceResourceIdsByRelativePaths_(item.body, relativePathToRoot);
        return await this.replaceNoteIdsByRelativePaths_(newBody, relativePathToRoot);
    }
    async replaceResourceIdsByRelativePaths_(noteBody, relativePathToRoot) {
        const linkedResourceIds = await Note_1.default.linkedResourceIds(noteBody);
        const resourcePaths = this.context() && this.context().destResourcePaths ? this.context().destResourcePaths : {};
        const createRelativePath = function (resourcePath) {
            return `${relativePathToRoot}_resources/${(0, path_utils_1.basename)(resourcePath)}`;
        };
        return await this.replaceItemIdsByRelativePaths_(noteBody, linkedResourceIds, resourcePaths, createRelativePath);
    }
    async replaceNoteIdsByRelativePaths_(noteBody, relativePathToRoot) {
        const linkedNoteIds = await Note_1.default.linkedNoteIds(noteBody);
        const notePaths = this.context() && this.context().notePaths ? this.context().notePaths : {};
        const createRelativePath = function (notePath) {
            return markdownUtils_1.default.escapeLinkUrl(`${relativePathToRoot}${notePath}`.trim());
        };
        return await this.replaceItemIdsByRelativePaths_(noteBody, linkedNoteIds, notePaths, createRelativePath);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
    async replaceItemIdsByRelativePaths_(noteBody, linkedItemIds, paths, fn_createRelativePath) {
        let newBody = noteBody;
        for (let i = 0; i < linkedItemIds.length; i++) {
            const id = linkedItemIds[i];
            const itemPath = fn_createRelativePath(paths[id]);
            newBody = newBody.replace(new RegExp(`:/${id}`, 'g'), markdownUtils_1.default.escapeLinkUrl(itemPath));
        }
        return newBody;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async prepareForProcessingItemType(itemType, itemsToExport) {
        if (itemType === BaseModel_1.default.TYPE_NOTE) {
            // Create unique file path for the note
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const context = {
                notePaths: {},
            };
            for (let i = 0; i < itemsToExport.length; i++) {
                const it = itemsToExport[i].type;
                if (it !== itemType)
                    continue;
                const itemOrId = itemsToExport[i].itemOrId;
                const note = typeof itemOrId === 'object' ? itemOrId : await Note_1.default.load(itemOrId);
                if (!note)
                    continue;
                const ext = note.markup_language === renderer_1.MarkupToHtml.MARKUP_LANGUAGE_HTML ? 'html' : 'md';
                let notePath = `${await this.makeDirPath_(note, null, false)}${(0, path_utils_1.friendlySafeFilename)(note.title, null)}.${ext}`;
                notePath = await shim_1.default.fsDriver().findUniqueFilename(`${this.destDir_}/${notePath}`, Object.values(context.notePaths), true);
                context.notePaths[note.id] = notePath;
            }
            // Strip the absolute path to export dir and keep only the relative paths
            const destDir = this.destDir_;
            Object.keys(context.notePaths).map((id) => {
                context.notePaths[id] = context.notePaths[id].substr(destDir.length + 1);
            });
            this.updateContext(context);
        }
    }
    async getNoteExportContent_(modNote) {
        return await Note_1.default.replaceResourceInternalToExternalLinks(await Note_1.default.serialize(modNote, ['body']));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(_itemType, item) {
        if ([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER].indexOf(item.type_) < 0)
            return;
        if (item.type_ === BaseModel_1.default.TYPE_FOLDER) {
            const dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;
            if (this.createdDirs_.indexOf(dirPath) < 0) {
                await shim_1.default.fsDriver().mkdir(dirPath);
                this.createdDirs_.push(dirPath);
            }
        }
        else if (item.type_ === BaseModel_1.default.TYPE_NOTE) {
            const notePaths = this.context() && this.context().notePaths ? this.context().notePaths : {};
            const noteFilePath = `${this.destDir_}/${notePaths[item.id]}`;
            const noteBody = await this.replaceLinkedItemIdsByRelativePaths_(item);
            const modNote = Object.assign(Object.assign({}, item), { body: noteBody });
            const noteContent = await this.getNoteExportContent_(modNote);
            await shim_1.default.fsDriver().mkdir((0, path_utils_1.dirname)(noteFilePath));
            await shim_1.default.fsDriver().writeFile(noteFilePath, noteContent, 'utf-8');
        }
    }
    async findReasonableFilename(resource, filePath) {
        let fileName = (0, path_utils_1.basename)(filePath);
        if (resource.filename) {
            fileName = (0, path_utils_1.safeFilename)(resource.filename);
        }
        else if (resource.title) {
            fileName = (0, path_utils_1.friendlySafeFilename)(resource.title, null, true);
        }
        // Fall back on the resource filename saved in the users resource folder
        return fileName;
    }
    async processResource(resource, filePath) {
        const context = this.context();
        if (!context.destResourcePaths)
            context.destResourcePaths = {};
        const fileName = await this.findReasonableFilename(resource, filePath);
        let destResourcePath = `${this.resourceDir_}/${fileName}`;
        destResourcePath = await shim_1.default.fsDriver().findUniqueFilename(destResourcePath, Object.values(context.destResourcePaths), true);
        await shim_1.default.fsDriver().copy(filePath, destResourcePath);
        context.destResourcePaths[resource.id] = destResourcePath;
        this.updateContext(context);
    }
    async close() { }
}
exports.default = InteropService_Exporter_Md;
