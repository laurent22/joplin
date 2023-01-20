"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderItem = exports.itemIsEncrypted = exports.localFileFromUrl = exports.isJoplinResourceBlobPath = exports.resourceBlobPath = exports.serializeJoplinItem = exports.unserializeJoplinItem = exports.isJoplinItemName = exports.linkedResourceIds = exports.initializeJoplinUtils = exports.resourceDirName = void 0;
const JoplinDatabase_1 = require("@joplin/lib/JoplinDatabase");
const BaseModel_1 = require("@joplin/lib/BaseModel");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
const Note_1 = require("@joplin/lib/models/Note");
const Folder_1 = require("@joplin/lib/models/Folder");
const Resource_1 = require("@joplin/lib/models/Resource");
const NoteTag_1 = require("@joplin/lib/models/NoteTag");
const Tag_1 = require("@joplin/lib/models/Tag");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
const Revision_1 = require("@joplin/lib/models/Revision");
const fs = require("fs-extra");
const time_1 = require("./time");
const errors_1 = require("./errors");
const renderer_1 = require("@joplin/renderer");
const EncryptionService_1 = require("@joplin/lib/services/e2ee/EncryptionService");
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
const theme_1 = require("@joplin/lib/theme");
const Setting_1 = require("@joplin/lib/models/Setting");
const Logger_1 = require("@joplin/lib/Logger");
const config_1 = require("../config");
const { substrWithEllipsis } = require('@joplin/lib/string-utils');
const logger = Logger_1.default.create('JoplinUtils');
const pluginAssetRootDir_ = require('path').resolve(__dirname, '../..', 'node_modules/@joplin/renderer/assets');
let db_ = null;
let models_ = null;
let mustache_ = null;
let baseUrl_ = null;
exports.resourceDirName = '.resource';
function initializeJoplinUtils(config, models, mustache) {
    return __awaiter(this, void 0, void 0, function* () {
        models_ = models;
        baseUrl_ = config.baseUrl;
        mustache_ = mustache;
        const filePath = `${config.tempDir}/joplin.sqlite`;
        yield fs.remove(filePath);
        db_ = new JoplinDatabase_1.default(new DatabaseDriverNode());
        // db_.setLogger(logger as Logger);
        yield db_.open({ name: filePath });
        BaseModel_1.default.setDb(db_);
        // Only load the classes that will be needed to render the notes and
        // resources.
        BaseItem_1.default.loadClass('Folder', Folder_1.default);
        BaseItem_1.default.loadClass('Note', Note_1.default);
        BaseItem_1.default.loadClass('Resource', Resource_1.default);
        BaseItem_1.default.loadClass('Tag', Tag_1.default);
        BaseItem_1.default.loadClass('NoteTag', NoteTag_1.default);
        BaseItem_1.default.loadClass('MasterKey', MasterKey_1.default);
        BaseItem_1.default.loadClass('Revision', Revision_1.default);
    });
}
exports.initializeJoplinUtils = initializeJoplinUtils;
function linkedResourceIds(body) {
    return Note_1.default.linkedItemIds(body);
}
exports.linkedResourceIds = linkedResourceIds;
function isJoplinItemName(name) {
    return !!name.match(/^[0-9a-zA-Z]{32}\.md$/);
}
exports.isJoplinItemName = isJoplinItemName;
function unserializeJoplinItem(body) {
    return __awaiter(this, void 0, void 0, function* () {
        return BaseItem_1.default.unserialize(body);
    });
}
exports.unserializeJoplinItem = unserializeJoplinItem;
function serializeJoplinItem(item) {
    return __awaiter(this, void 0, void 0, function* () {
        const ModelClass = BaseItem_1.default.itemClass(item);
        return ModelClass.serialize(item);
    });
}
exports.serializeJoplinItem = serializeJoplinItem;
function resourceBlobPath(resourceId) {
    return `${exports.resourceDirName}/${resourceId}`;
}
exports.resourceBlobPath = resourceBlobPath;
function isJoplinResourceBlobPath(path) {
    return path.indexOf(exports.resourceDirName) === 0;
}
exports.isJoplinResourceBlobPath = isJoplinResourceBlobPath;
function localFileFromUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const cssPluginAssets = 'css/pluginAssets/';
        const jsPluginAssets = 'js/pluginAssets/';
        if (url.indexOf(cssPluginAssets) === 0)
            return `${pluginAssetRootDir_}/${url.substr(cssPluginAssets.length)}`;
        if (url.indexOf(jsPluginAssets) === 0)
            return `${pluginAssetRootDir_}/${url.substr(jsPluginAssets.length)}`;
        return null;
    });
}
exports.localFileFromUrl = localFileFromUrl;
function getResourceInfos(linkedItemInfos) {
    return __awaiter(this, void 0, void 0, function* () {
        const output = {};
        for (const itemId of Object.keys(linkedItemInfos)) {
            const info = linkedItemInfos[itemId];
            if (info.item.type_ !== BaseModel_1.ModelType.Resource)
                continue;
            output[info.item.id] = {
                item: info.item,
                localState: {
                    fetch_status: Resource_1.default.FETCH_STATUS_DONE,
                },
            };
        }
        return output;
    });
}
function noteLinkedItemInfos(userId, itemModel, noteBody) {
    return __awaiter(this, void 0, void 0, function* () {
        const jopIds = yield Note_1.default.linkedItemIds(noteBody);
        const output = {};
        for (const jopId of jopIds) {
            const item = yield itemModel.loadByJopId(userId, jopId, { fields: ['*'], withContent: true });
            if (!item)
                continue;
            output[jopId] = {
                item: itemModel.itemToJoplinItem(item),
                file: null,
            };
        }
        return output;
    });
}
function renderResource(userId, resourceId, item, content) {
    return __awaiter(this, void 0, void 0, function* () {
        // The item passed to this function is the resource blob, which is
        // sufficient to download the resource. However, if we want a more user
        // friendly download, we need to know the resource original name and mime
        // type. So below, we try to get that information.
        let jopItem = null;
        try {
            const resourceItem = yield models_.item().loadByJopId(userId, resourceId);
            jopItem = yield models_.item().loadAsJoplinItem(resourceItem.id);
        }
        catch (error) {
            logger.error(`Could not load Joplin item ${resourceId} associated with item: ${item.id}`);
        }
        return {
            body: content,
            mime: jopItem ? jopItem.mime : item.mime_type,
            size: content ? content.byteLength : 0,
            filename: jopItem ? jopItem.title : '',
        };
    });
}
function renderNote(share, note, resourceInfos, linkedItemInfos) {
    return __awaiter(this, void 0, void 0, function* () {
        const markupToHtml = new renderer_1.MarkupToHtml({
            ResourceModel: Resource_1.default,
        });
        const renderOptions = {
            resources: resourceInfos,
            itemIdToUrl: (itemId) => {
                if (!linkedItemInfos[itemId])
                    return '#';
                const item = linkedItemInfos[itemId].item;
                if (!item)
                    throw new Error(`No such item in this note: ${itemId}`);
                if (item.type_ === BaseModel_1.ModelType.Note) {
                    return `${models_.share().shareUrl(share.owner_id, share.id)}?note_id=${item.id}&t=${item.updated_time}`;
                }
                else if (item.type_ === BaseModel_1.ModelType.Resource) {
                    return `${models_.share().shareUrl(share.owner_id, share.id)}?resource_id=${item.id}&t=${item.updated_time}`;
                }
                else {
                    // In theory, there can only be links to notes or resources. But
                    // in practice nothing's stopping a plugin for example to create
                    // a link to a folder. In this case, we don't want to throw an
                    // exception as that would break rendering. Instead we just
                    // disable the link.
                    // https://github.com/laurent22/joplin/issues/6531
                    logger.warn(`Unsupported type in share ${share.id}. Item: ${itemId}`);
                    return '#';
                }
            },
            // Switch-off the media players because there's no option to toggle
            // them on and off.
            audioPlayerEnabled: false,
            videoPlayerEnabled: false,
            pdfViewerEnabled: false,
            checkboxDisabled: true,
            linkRenderingType: 2,
        };
        const result = yield markupToHtml.render(note.markup_language, note.body, (0, theme_1.themeStyle)(Setting_1.default.THEME_LIGHT), renderOptions);
        const bodyHtml = yield mustache_.renderView({
            cssFiles: ['items/note'],
            jsFiles: ['items/note'],
            name: 'note',
            title: `${substrWithEllipsis(note.title, 0, 100)} - ${(0, config_1.default)().appName}`,
            titleOverride: true,
            path: 'index/items/note',
            content: {
                note: Object.assign(Object.assign({}, note), { bodyHtml: result.html, updatedDateTime: (0, time_1.formatDateTime)(note.updated_time) }),
                cssStrings: result.cssStrings.join('\n'),
                assetsJs: `
				const joplinNoteViewer = {
					pluginAssets: ${JSON.stringify(result.pluginAssets)},
					appBaseUrl: ${JSON.stringify(baseUrl_)},
				};
			`,
            },
        }, { prefersDarkEnabled: false });
        return {
            body: bodyHtml,
            mime: 'text/html',
            size: Buffer.byteLength(bodyHtml, 'utf-8'),
            filename: '',
        };
    });
}
function itemIsEncrypted(item) {
    if ('jop_encryption_applied' in item)
        return !!item.jop_encryption_applied;
    if (!('content' in item))
        throw new Error('Cannot check encryption - item is missing both "content" and "jop_encryption_applied" property');
    const header = item.content.toString('utf8', 0, 5);
    return (0, EncryptionService_1.isValidHeaderIdentifier)(header);
}
exports.itemIsEncrypted = itemIsEncrypted;
const findParentNote = (itemTree, resourceId) => __awaiter(void 0, void 0, void 0, function* () {
    const find_ = (parentItem, currentTreeItems, resourceId) => {
        for (const it of currentTreeItems) {
            if (it.resource_id === resourceId)
                return parentItem;
            const child = find_(it, it.children, resourceId);
            if (child)
                return it;
        }
        return null;
    };
    const result = find_(itemTree, itemTree.children, resourceId);
    if (!result)
        throw new errors_1.ErrorBadRequest(`Cannot find parent of ${resourceId}`);
    const item = yield models_.item().loadWithContent(result.item_id);
    if (!item)
        throw new errors_1.ErrorNotFound(`Cannot load item with ID ${result.item_id}`);
    return models_.item().itemToJoplinItem(item);
});
const isInTree = (itemTree, jopId) => {
    if (itemTree.resource_id === jopId)
        return true;
    for (const child of itemTree.children) {
        if (child.resource_id === jopId)
            return true;
        const found = isInTree(child, jopId);
        if (found)
            return true;
    }
    return false;
};
// "item" is always the item associated with the share (the "root item"). It may
// be different from the item that will eventually get rendered - for example
// for resources or linked notes.
function renderItem(userId, item, share, query) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootNote = models_.item().itemToJoplinItem(item);
        const itemTree = yield models_.itemResource().itemTree(item.id, rootNote.id);
        let linkedItemInfos = {};
        let resourceInfos = {};
        let fileToRender;
        let itemToRender = null;
        if (query.resource_id) {
            // ------------------------------------------------------------------------------------------
            // Render a resource that is attached to a note
            // ------------------------------------------------------------------------------------------
            const resourceItem = yield models_.item().loadByName(userId, resourceBlobPath(query.resource_id), { fields: ['*'], withContent: true });
            if (!resourceItem)
                throw new errors_1.ErrorNotFound(`No such resource: ${query.resource_id}`);
            fileToRender = {
                item: resourceItem,
                content: resourceItem.content,
                jopItemId: query.resource_id,
            };
            const parentNote = yield findParentNote(itemTree, fileToRender.jopItemId);
            linkedItemInfos = yield noteLinkedItemInfos(userId, models_.item(), parentNote.body);
            itemToRender = linkedItemInfos[fileToRender.jopItemId].item;
        }
        else if (query.note_id) {
            // ------------------------------------------------------------------------------------------
            // Render a linked note
            // ------------------------------------------------------------------------------------------
            if (!share.recursive)
                throw new errors_1.ErrorForbidden('This linked note has not been published');
            const noteItem = yield models_.item().loadByName(userId, `${query.note_id}.md`, { fields: ['*'], withContent: true });
            if (!noteItem)
                throw new errors_1.ErrorNotFound(`No such note: ${query.note_id}`);
            fileToRender = {
                item: noteItem,
                content: noteItem.content,
                jopItemId: query.note_id,
            };
            linkedItemInfos = yield noteLinkedItemInfos(userId, models_.item(), noteItem.content.toString());
            resourceInfos = yield getResourceInfos(linkedItemInfos);
            itemToRender = models_.item().itemToJoplinItem(noteItem);
        }
        else {
            // ------------------------------------------------------------------------------------------
            // Render the root note
            // ------------------------------------------------------------------------------------------
            fileToRender = {
                item: item,
                content: null,
                jopItemId: rootNote.id,
            };
            linkedItemInfos = yield noteLinkedItemInfos(userId, models_.item(), rootNote.body);
            resourceInfos = yield getResourceInfos(linkedItemInfos);
            itemToRender = rootNote;
        }
        if (!itemToRender)
            throw new errors_1.ErrorNotFound(`Cannot render item: ${item.id}: ${JSON.stringify(query)}`);
        // Verify that the item we're going to render is indeed part of the item
        // tree (i.e. it is either the root note, or one of the ancestor is the root
        // note). This is for security reason - otherwise it would be possible to
        // display any note by setting note_id to an arbitrary ID.
        if (!isInTree(itemTree, fileToRender.jopItemId)) {
            throw new errors_1.ErrorNotFound(`Item "${fileToRender.jopItemId}" does not belong to this share`);
        }
        const itemType = itemToRender.type_;
        if (itemType === BaseModel_1.ModelType.Resource) {
            return renderResource(userId, fileToRender.jopItemId, fileToRender.item, fileToRender.content);
        }
        else if (itemType === BaseModel_1.ModelType.Note) {
            return renderNote(share, itemToRender, resourceInfos, linkedItemInfos);
        }
        else {
            throw new Error(`Cannot render item with type "${itemType}"`);
        }
    });
}
exports.renderItem = renderItem;
//# sourceMappingURL=joplinUtils.js.map