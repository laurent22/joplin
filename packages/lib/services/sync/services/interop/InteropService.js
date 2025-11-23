"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const shim_1 = require("../../shim");
const locale_1 = require("../../locale");
const BaseItem_1 = require("../../models/BaseItem");
const BaseModel_1 = require("../../BaseModel");
const Resource_1 = require("../../models/Resource");
const Folder_1 = require("../../models/Folder");
const NoteTag_1 = require("../../models/NoteTag");
const Note_1 = require("../../models/Note");
const ArrayUtils = require("../../ArrayUtils");
const InteropService_Importer_Jex_1 = require("./InteropService_Importer_Jex");
const InteropService_Importer_Md_1 = require("./InteropService_Importer_Md");
const InteropService_Importer_Md_frontmatter_1 = require("./InteropService_Importer_Md_frontmatter");
const InteropService_Importer_Raw_1 = require("./InteropService_Importer_Raw");
const InteropService_Exporter_Jex_1 = require("./InteropService_Exporter_Jex");
const InteropService_Exporter_Raw_1 = require("./InteropService_Exporter_Raw");
const InteropService_Exporter_Md_1 = require("./InteropService_Exporter_Md");
const InteropService_Exporter_Md_frontmatter_1 = require("./InteropService_Exporter_Md_frontmatter");
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
const Module_1 = require("./Module");
const InteropService_Exporter_Html_1 = require("./InteropService_Exporter_Html");
const InteropService_Importer_EnexToHtml_1 = require("./InteropService_Importer_EnexToHtml");
const InteropService_Importer_EnexToMd_1 = require("./InteropService_Importer_EnexToMd");
const InteropService_Importer_OneNote_1 = require("./InteropService_Importer_OneNote");
const { sprintf } = require('sprintf-js');
const { fileExtension } = require('../../path-utils');
const EventEmitter = require('events');
class InteropService {
    static instance() {
        if (!this.instance_)
            this.instance_ = new InteropService();
        return this.instance_;
    }
    constructor() {
        this.userModules_ = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.eventEmitter_ = null;
        this.eventEmitter_ = new EventEmitter();
    }
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    on(eventName, callback) {
        return this.eventEmitter_.on(eventName, callback);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    off(eventName, callback) {
        return this.eventEmitter_.removeListener(eventName, callback);
    }
    modules() {
        if (!this.defaultModules_) {
            const importModules = [
                (0, Module_1.makeImportModule)({
                    format: 'jex',
                    fileExtensions: ['jex'],
                    sources: [types_1.FileSystemItem.File],
                    description: (0, locale_1._)('Joplin Export File'),
                }, () => new InteropService_Importer_Jex_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'raw',
                    sources: [types_1.FileSystemItem.Directory],
                    description: (0, locale_1._)('Joplin Export Directory'),
                    separatorAfter: true,
                }, () => new InteropService_Importer_Raw_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'enex',
                    fileExtensions: ['enex'],
                    sources: [types_1.FileSystemItem.File],
                    description: (0, locale_1._)('Evernote Export File (as HTML)'),
                    supportsMobile: false,
                    outputFormat: types_1.ImportModuleOutputFormat.Html,
                }, () => new InteropService_Importer_EnexToHtml_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'enex',
                    fileExtensions: ['enex'],
                    sources: [types_1.FileSystemItem.File],
                    description: (0, locale_1._)('Evernote Export File (as Markdown)'),
                    supportsMobile: false,
                    isDefault: true,
                }, () => new InteropService_Importer_EnexToMd_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'enex',
                    fileExtensions: ['enex'],
                    sources: [types_1.FileSystemItem.Directory],
                    description: (0, locale_1._)('Evernote Export Files (Directory, as HTML)'),
                    supportsMobile: false,
                    outputFormat: types_1.ImportModuleOutputFormat.Html,
                }, () => new InteropService_Importer_EnexToHtml_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'enex',
                    fileExtensions: ['enex'],
                    sources: [types_1.FileSystemItem.Directory],
                    description: (0, locale_1._)('Evernote Export Files (Directory, as Markdown)'),
                    supportsMobile: false,
                }, () => new InteropService_Importer_EnexToMd_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'html',
                    fileExtensions: ['html'],
                    sources: [types_1.FileSystemItem.File, types_1.FileSystemItem.Directory],
                    isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
                    description: (0, locale_1._)('HTML document'),
                }, () => new InteropService_Importer_Md_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'md',
                    fileExtensions: ['md', 'markdown', 'txt', 'html'],
                    sources: [types_1.FileSystemItem.File, types_1.FileSystemItem.Directory],
                    isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
                    description: (0, locale_1._)('Markdown'),
                }, () => new InteropService_Importer_Md_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'md_frontmatter',
                    fileExtensions: ['md', 'markdown', 'txt', 'html'],
                    sources: [types_1.FileSystemItem.File, types_1.FileSystemItem.Directory],
                    isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
                    description: (0, locale_1._)('Markdown + Front Matter'),
                }, () => new InteropService_Importer_Md_frontmatter_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'txt',
                    fileExtensions: ['txt'],
                    sources: [types_1.FileSystemItem.File, types_1.FileSystemItem.Directory],
                    isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
                    description: (0, locale_1._)('Text document'),
                }, () => new InteropService_Importer_Md_1.default()),
                (0, Module_1.makeImportModule)({
                    format: 'zip',
                    fileExtensions: [
                        'zip',
                        'one',
                        // .onepkg is a CAB archive, which Joplin can currently only extract on Windows
                        ...(shim_1.default.isWindows() ? ['onepkg'] : []),
                    ],
                    sources: [types_1.FileSystemItem.File],
                    isNoteArchive: false, // Tells whether the file can contain multiple notes (eg. Enex or Jex format)
                    description: (0, locale_1._)('OneNote Notebook'),
                }, () => new InteropService_Importer_OneNote_1.default()),
            ];
            const exportModules = [
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.Jex,
                    fileExtensions: ['jex'],
                    target: types_1.FileSystemItem.File,
                    description: (0, locale_1._)('Joplin Export File'),
                }, () => new InteropService_Exporter_Jex_1.default()),
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.Raw,
                    target: types_1.FileSystemItem.Directory,
                    description: (0, locale_1._)('Joplin Export Directory'),
                }, () => new InteropService_Exporter_Raw_1.default()),
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.Markdown,
                    target: types_1.FileSystemItem.Directory,
                    description: (0, locale_1._)('Markdown'),
                }, () => new InteropService_Exporter_Md_1.default()),
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.MarkdownFrontMatter,
                    target: types_1.FileSystemItem.Directory,
                    description: (0, locale_1._)('Markdown + Front Matter'),
                }, () => new InteropService_Exporter_Md_frontmatter_1.default()),
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.Html,
                    fileExtensions: ['html', 'htm'],
                    target: types_1.FileSystemItem.File,
                    isNoteArchive: false,
                    description: (0, locale_1._)('HTML File'),
                    supportsMobile: false,
                }, () => new InteropService_Exporter_Html_1.default()),
                (0, Module_1.makeExportModule)({
                    format: types_1.ExportModuleOutputFormat.Html,
                    target: types_1.FileSystemItem.Directory,
                    description: (0, locale_1._)('HTML Directory'),
                    supportsMobile: false,
                }, () => new InteropService_Exporter_Html_1.default()),
            ];
            this.defaultModules_ = importModules.concat(exportModules);
        }
        return this.defaultModules_.concat(this.userModules_);
    }
    registerModule(module) {
        this.userModules_.push(module);
        this.eventEmitter_.emit('modulesChanged');
    }
    set xmlSerializer(xmlSerializer) {
        this.xmlSerializer_ = xmlSerializer;
    }
    get xmlSerializer() {
        return this.xmlSerializer_;
    }
    set domParser(domParser) {
        this.domParser_ = domParser;
    }
    get domParser() {
        return this.domParser_;
    }
    // Find the module that matches the given type ("importer" or "exporter")
    // and the given format. Some formats can have multiple associated importers
    // or exporters, such as ENEX. In this case, the one marked as "isDefault"
    // is returned. This is useful to auto-detect the module based on the format.
    // For more precise matching, newModuleFromPath_ should be used.
    findModuleByFormat_(type, format, target = null, outputFormat = null) {
        const modules = this.modules();
        const matches = [];
        const isMobile = shim_1.default.mobilePlatform() !== '';
        for (let i = 0; i < modules.length; i++) {
            const m = modules[i];
            if (!m.supportsMobile && isMobile) {
                continue;
            }
            if (m.format === format && m.type === type) {
                if (!target && !outputFormat) {
                    matches.push(m);
                }
                else if (m.type === types_1.ModuleType.Exporter && target && target === m.target) {
                    matches.push(m);
                }
                else if (m.type === types_1.ModuleType.Importer && outputFormat && outputFormat === m.outputFormat) {
                    matches.push(m);
                }
            }
        }
        const output = matches.find(m => !!m.isDefault);
        if (output)
            return output;
        return matches.length ? matches[0] : null;
    }
    // NOTE TO FUTURE SELF: It might make sense to simply move all the existing
    // formatters to the `newModuleFromPath_` approach, so that there's only one way
    // to do this mapping. This isn't a priority right now (per the convo in:
    // https://github.com/laurent22/joplin/pull/1795#discussion_r322379121) but
    // we can do it if it ever becomes necessary.
    newModuleByFormat_(type, format, outputFormat = types_1.ImportModuleOutputFormat.Markdown) {
        const moduleMetadata = this.findModuleByFormat_(type, format, null, outputFormat);
        if (!moduleMetadata)
            throw new Error((0, locale_1._)('Cannot load "%s" module for format "%s" and output "%s"', type, format, outputFormat));
        return moduleMetadata.factory();
    }
    // The existing `newModuleByFormat_` fn would load by the input format. This
    // was fine when there was a 1-1 mapping of input formats to output formats,
    // but now that we have 2 possible outputs for an `enex` input, we need to be
    // explicit with which importer we want to use.
    //
    // https://github.com/laurent22/joplin/pull/1795#pullrequestreview-281574417
    newModuleFromPath_(type, options) {
        const moduleMetadata = this.findModuleByFormat_(type, options.format, options.target);
        if (!moduleMetadata)
            throw new Error((0, locale_1._)('Cannot load "%s" module for format "%s" and target "%s"', type, options.format, options.target));
        return moduleMetadata.factory(options);
    }
    moduleByFileExtension_(type, ext) {
        ext = ext.toLowerCase();
        const modules = this.modules();
        for (let i = 0; i < modules.length; i++) {
            const m = modules[i];
            if (type !== m.type)
                continue;
            if (m.fileExtensions.includes(ext))
                return m;
        }
        return null;
    }
    async import(options) {
        if (!(await shim_1.default.fsDriver().exists(options.path)))
            throw new Error((0, locale_1._)('Cannot find "%s".', options.path));
        options = Object.assign({ format: 'auto', destinationFolderId: null, destinationFolder: null, xmlSerializer: this.xmlSerializer, domParser: this.domParser }, options);
        if (options.format === 'auto') {
            const module = this.moduleByFileExtension_(types_1.ModuleType.Importer, fileExtension(options.path));
            if (!module)
                throw new Error((0, locale_1._)('Please specify import format for %s', options.path));
            options.format = module.format;
        }
        if (options.destinationFolderId) {
            const folder = await Folder_1.default.load(options.destinationFolderId);
            if (!folder)
                throw new Error((0, locale_1._)('Cannot find "%s".', options.destinationFolderId));
            options.destinationFolder = folder;
        }
        let result = { warnings: [] };
        const importer = this.newModuleByFormat_(types_1.ModuleType.Importer, options.format, options.outputFormat);
        if (!(importer instanceof InteropService_Importer_Base_1.default)) {
            throw new Error('Resolved importer is not an importer');
        }
        await importer.init(options.path, options);
        result = await importer.exec(result);
        return result;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    normalizeItemForExport(_itemType, item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const override = {};
        if ('is_shared' in item)
            override.is_shared = 0;
        if ('share_id' in item)
            override.share_id = '';
        if (Object.keys(override).length) {
            return Object.assign(Object.assign({}, item), override);
        }
        else {
            return item;
        }
    }
    async export(options) {
        var _a, _b, _c;
        options = Object.assign({ format: types_1.ExportModuleOutputFormat.Jex }, options);
        const exportPath = options.path ? options.path : null;
        let sourceFolderIds = options.sourceFolderIds ? options.sourceFolderIds : [];
        const sourceNoteIds = options.sourceNoteIds ? options.sourceNoteIds : [];
        const result = { warnings: [] };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const itemsToExport = [];
        (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, types_1.ExportProgressState.QueuingItems, null);
        let totalItemsToProcess = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const queueExportItem = (itemType, itemOrId) => {
            totalItemsToProcess++;
            itemsToExport.push({
                type: itemType,
                itemOrId: itemOrId,
            });
        };
        const exportedNoteIds = [];
        let resourceIds = [];
        // Recursively get all the folders that have valid parents
        const folderIds = await Folder_1.default.childrenIds('');
        if (options.includeConflicts)
            folderIds.push(Folder_1.default.conflictFolderId());
        let fullSourceFolderIds = sourceFolderIds.slice();
        for (let i = 0; i < sourceFolderIds.length; i++) {
            const id = sourceFolderIds[i];
            const childrenIds = await Folder_1.default.childrenIds(id);
            fullSourceFolderIds = fullSourceFolderIds.concat(childrenIds);
        }
        sourceFolderIds = fullSourceFolderIds;
        for (let folderIndex = 0; folderIndex < folderIds.length; folderIndex++) {
            const folderId = folderIds[folderIndex];
            if (sourceFolderIds.length && sourceFolderIds.indexOf(folderId) < 0)
                continue;
            if (!sourceNoteIds.length)
                await queueExportItem(BaseModel_1.default.TYPE_FOLDER, folderId);
            const noteIds = await Folder_1.default.noteIds(folderId, { includeConflicts: !!options.includeConflicts });
            for (let noteIndex = 0; noteIndex < noteIds.length; noteIndex++) {
                const noteId = noteIds[noteIndex];
                if (sourceNoteIds.length && sourceNoteIds.indexOf(noteId) < 0)
                    continue;
                const note = await Note_1.default.load(noteId);
                await queueExportItem(BaseModel_1.default.TYPE_NOTE, note);
                exportedNoteIds.push(noteId);
                const rids = await Note_1.default.linkedResourceIds(note.body);
                resourceIds = resourceIds.concat(rids);
            }
        }
        resourceIds = ArrayUtils.unique(resourceIds);
        for (let i = 0; i < resourceIds.length; i++) {
            await queueExportItem(BaseModel_1.default.TYPE_RESOURCE, resourceIds[i]);
        }
        const noteTags = await NoteTag_1.default.all();
        const exportedTagIds = [];
        for (let i = 0; i < noteTags.length; i++) {
            const noteTag = noteTags[i];
            if (exportedNoteIds.indexOf(noteTag.note_id) < 0)
                continue;
            await queueExportItem(BaseModel_1.default.TYPE_NOTE_TAG, noteTag.id);
            exportedTagIds.push(noteTag.tag_id);
        }
        for (let i = 0; i < exportedTagIds.length; i++) {
            await queueExportItem(BaseModel_1.default.TYPE_TAG, exportedTagIds[i]);
        }
        const exporter = this.newModuleFromPath_(types_1.ModuleType.Exporter, options);
        if (!(exporter instanceof InteropService_Exporter_Base_1.default)) {
            throw new Error('Resolved exporter is not an exporter');
        }
        await exporter.init(exportPath, options);
        const typeOrder = [BaseModel_1.default.TYPE_FOLDER, BaseModel_1.default.TYPE_RESOURCE, BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_TAG, BaseModel_1.default.TYPE_NOTE_TAG];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const context = {
            resourcePaths: {},
        };
        // Prepare to process each type before starting any
        // This will allow exporters to operate on the full context
        for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
            const type = typeOrder[typeOrderIndex];
            await exporter.prepareForProcessingItemType(type, itemsToExport);
        }
        let itemsProcessed = 0;
        for (let typeOrderIndex = 0; typeOrderIndex < typeOrder.length; typeOrderIndex++) {
            const type = typeOrder[typeOrderIndex];
            for (let i = 0; i < itemsToExport.length; i++) {
                const itemType = itemsToExport[i].type;
                if (itemType !== type)
                    continue;
                const ItemClass = BaseItem_1.default.getClassByItemType(itemType);
                const itemOrId = itemsToExport[i].itemOrId;
                const rawItem = typeof itemOrId === 'object' ? itemOrId : await ItemClass.load(itemOrId);
                if (!rawItem) {
                    if (itemType === BaseModel_1.default.TYPE_RESOURCE) {
                        result.warnings.push(sprintf('A resource that does not exist is referenced in a note. The resource was skipped. Resource ID: %s', itemOrId));
                    }
                    else {
                        result.warnings.push(sprintf('Cannot find item with type "%s" and ID %s. Item was skipped.', ItemClass.tableName(), JSON.stringify(itemOrId)));
                    }
                    continue;
                }
                const item = this.normalizeItemForExport(itemType, rawItem);
                if (item.encryption_applied || item.encryption_blob_encrypted) {
                    result.warnings.push(sprintf('This item is currently encrypted: %s "%s" (%s) and was not exported. You may wait for it to be decrypted and try again.', BaseModel_1.default.modelTypeToName(itemType), item.title ? item.title : item.id, item.id));
                    continue;
                }
                try {
                    if (itemType === BaseModel_1.default.TYPE_RESOURCE) {
                        const resourcePath = Resource_1.default.fullPath(item);
                        context.resourcePaths[item.id] = resourcePath;
                        exporter.updateContext(context);
                        await exporter.processResource(item, resourcePath);
                    }
                    await exporter.processItem(itemType, item);
                }
                catch (error) {
                    console.error(error);
                    result.warnings.push(error.message);
                }
                itemsProcessed++;
                (_b = options.onProgress) === null || _b === void 0 ? void 0 : _b.call(options, types_1.ExportProgressState.Exporting, itemsProcessed / totalItemsToProcess);
            }
        }
        (_c = options.onProgress) === null || _c === void 0 ? void 0 : _c.call(options, types_1.ExportProgressState.Closing, null);
        await exporter.close();
        return result;
    }
}
exports.default = InteropService;
