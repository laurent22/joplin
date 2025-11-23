"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceOcrStatusToString = void 0;
const BaseModel_1 = require("../BaseModel");
const BaseItem_1 = require("./BaseItem");
const ItemChange_1 = require("./ItemChange");
const NoteResource_1 = require("./NoteResource");
const Setting_1 = require("./Setting");
const markdownUtils_1 = require("../markdownUtils");
const locale_1 = require("../locale");
const types_1 = require("../services/database/types");
const ResourceLocalState_1 = require("./ResourceLocalState");
const pathUtils = require("../path-utils");
const path_utils_1 = require("../path-utils");
const mime = require("../mime-utils");
const { FsDriverDummy } = require('../fs-driver-dummy.js');
const JoplinError_1 = require("../JoplinError");
const itemCanBeEncrypted_1 = require("./utils/itemCanBeEncrypted");
const syncInfoUtils_1 = require("../services/synchronizer/syncInfoUtils");
const renderer_1 = require("@joplin/renderer");
const html_1 = require("@joplin/utils/html");
const eventManager_1 = require("../eventManager");
const array_1 = require("../array");
const ActionLogger_1 = require("../utils/ActionLogger");
const isSqliteSyntaxError_1 = require("../services/database/isSqliteSyntaxError");
const resourceUtils_1 = require("./utils/resourceUtils");
const resourceOcrStatusToString = (status) => {
    const s = {
        [types_1.ResourceOcrStatus.Todo]: (0, locale_1._)('Idle'),
        [types_1.ResourceOcrStatus.Processing]: (0, locale_1._)('Processing'),
        [types_1.ResourceOcrStatus.Error]: (0, locale_1._)('Error'),
        [types_1.ResourceOcrStatus.Done]: (0, locale_1._)('Done'),
    };
    return s[status];
};
exports.resourceOcrStatusToString = resourceOcrStatusToString;
class Resource extends BaseItem_1.default {
    static tableName() {
        return 'resources';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_RESOURCE;
    }
    static encryptionService() {
        if (!this.encryptionService_)
            throw new Error('Resource.encryptionService_ is not set!!');
        return this.encryptionService_;
    }
    static shareService() {
        if (!this.shareService_)
            throw new Error('Resource.shareService_ is not set!!');
        return this.shareService_;
    }
    static isSupportedImageMimeType(type) {
        return (0, resourceUtils_1.isSupportedImageMimeType)(type);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static fetchStatuses(resourceIds) {
        if (!resourceIds.length)
            return Promise.resolve([]);
        return this.db().selectAll(`SELECT resource_id, fetch_status FROM resource_local_states WHERE resource_id IN (${this.escapeIdsForSql(resourceIds)})`);
    }
    static sharedResourceIds() {
        return this.db().selectAllFields('SELECT id FROM resources WHERE is_shared = 1', [], 'id');
    }
    static errorFetchStatuses() {
        return this.db().selectAll(`
			SELECT title AS resource_title, resource_id, fetch_error
			FROM resource_local_states
			LEFT JOIN resources ON resources.id = resource_local_states.resource_id
			WHERE fetch_status = ?
		`, [Resource.FETCH_STATUS_ERROR]);
    }
    static needToBeFetched(resourceDownloadMode = null, limit = null) {
        const sql = ['SELECT * FROM resources WHERE encryption_applied = 0 AND id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = ?)'];
        if (resourceDownloadMode !== 'always') {
            sql.push('AND resources.id IN (SELECT resource_id FROM resources_to_download)');
        }
        sql.push('ORDER BY updated_time DESC');
        if (limit !== null)
            sql.push(`LIMIT ${limit}`);
        return this.modelSelectAll(sql.join(' '), [Resource.FETCH_STATUS_IDLE]);
    }
    static async resetStartedFetchStatus() {
        return await this.db().exec('UPDATE resource_local_states SET fetch_status = ? WHERE fetch_status = ?', [Resource.FETCH_STATUS_IDLE, Resource.FETCH_STATUS_STARTED]);
    }
    static async resetFetchErrorStatus(resourceId) {
        await this.db().exec('UPDATE resource_local_states SET fetch_status = ?, fetch_error = \'\' WHERE resource_id = ?', [Resource.FETCH_STATUS_IDLE, resourceId]);
        await this.resetOcrStatus(resourceId);
    }
    static fsDriver() {
        if (!Resource.fsDriver_)
            Resource.fsDriver_ = new FsDriverDummy();
        return Resource.fsDriver_;
    }
    // DEPRECATED IN FAVOUR OF friendlySafeFilename()
    static friendlyFilename(resource) {
        let output = (0, path_utils_1.safeFilename)(resource.title); // Make sure not to allow spaces or any special characters as it's not supported in HTTP headers
        if (!output)
            output = resource.id;
        let extension = resource.file_extension;
        if (!extension)
            extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
        extension = extension ? `.${extension}` : '';
        return output + extension;
    }
    static baseDirectoryPath() {
        return Setting_1.default.value('resourceDir');
    }
    static baseRelativeDirectoryPath() {
        return Setting_1.default.value('resourceDirName');
    }
    static filename(resource, encryptedBlob = false) {
        return (0, resourceUtils_1.resourceFilename)(resource, encryptedBlob);
    }
    static friendlySafeFilename(resource) {
        let ext = resource.file_extension;
        if (!ext)
            ext = resource.mime ? mime.toFileExtension(resource.mime) : '';
        const safeExt = ext ? pathUtils.safeFileExtension(ext).toLowerCase() : '';
        let title = resource.title ? resource.title : resource.id;
        if (safeExt && pathUtils.fileExtension(title).toLowerCase() === safeExt)
            title = pathUtils.filename(title);
        return pathUtils.friendlySafeFilename(title) + (safeExt ? `.${safeExt}` : '');
    }
    static relativePath(resource, encryptedBlob = false) {
        return (0, resourceUtils_1.resourceRelativePath)(resource, this.baseRelativeDirectoryPath(), encryptedBlob);
    }
    static fullPath(resource, encryptedBlob = false) {
        return (0, resourceUtils_1.resourceFullPath)(resource, this.baseDirectoryPath(), encryptedBlob);
    }
    static async isReady(resource) {
        const r = await this.readyStatus(resource);
        return r === 'ok';
    }
    static async readyStatus(resource) {
        const ls = await this.localState(resource);
        if (!resource)
            return 'notFound';
        if (ls.fetch_status !== Resource.FETCH_STATUS_DONE)
            return 'notDownloaded';
        if (resource.encryption_blob_encrypted)
            return 'encrypted';
        return 'ok';
    }
    static async requireIsReady(resource) {
        const readyStatus = await Resource.readyStatus(resource);
        if (readyStatus !== 'ok')
            throw new Error(`Resource is not ready. Status: ${readyStatus}`);
    }
    // For resources, we need to decrypt the item (metadata) and the resource binary blob.
    static async decrypt(item) {
        // The item might already be decrypted but not the blob (for instance if it crashes while
        // decrypting the blob or was otherwise interrupted).
        const decryptedItem = item.encryption_cipher_text ? await super.decrypt(item) : Object.assign({}, item);
        if (!decryptedItem.encryption_blob_encrypted)
            return decryptedItem;
        const localState = await this.localState(item);
        if (localState.fetch_status !== Resource.FETCH_STATUS_DONE) {
            // Not an error - it means the blob has not been downloaded yet.
            // It will be decrypted later on, once downloaded.
            return decryptedItem;
        }
        const plainTextPath = this.fullPath(decryptedItem);
        const encryptedPath = this.fullPath(decryptedItem, true);
        const noExtPath = `${pathUtils.dirname(encryptedPath)}/${pathUtils.filename(encryptedPath)}`;
        // When the resource blob is downloaded by the synchroniser, it's initially a file with no
        // extension (since it's encrypted, so we don't know its extension). So here rename it
        // to a file with a ".crypted" extension so that it's better identified, and then decrypt it.
        // Potentially plainTextPath is also a path with no extension if it's an unknown mime type.
        if (await this.fsDriver().exists(noExtPath)) {
            await this.fsDriver().move(noExtPath, encryptedPath);
        }
        try {
            await this.encryptionService().decryptFile(encryptedPath, plainTextPath);
        }
        catch (error) {
            if (error.code === 'invalidIdentifier') {
                // As the identifier is invalid it most likely means that this is not encrypted data
                // at all. It can happen for example when there's a crash between the moment the data
                // is decrypted and the resource item is updated.
                this.logger().warn(`Found a resource that was most likely already decrypted but was marked as encrypted. Marked it as decrypted: ${item.id}`);
                this.fsDriver().move(encryptedPath, plainTextPath);
            }
            else {
                throw error;
            }
        }
        decryptedItem.encryption_blob_encrypted = 0;
        return super.save(decryptedItem, { autoTimestamp: false });
    }
    // Prepare the resource by encrypting it if needed.
    // The call returns the path to the physical file AND a representation of the resource object
    // as it should be uploaded to the sync target. Note that this may be different from what is stored
    // in the database. In particular, the flag encryption_blob_encrypted might be 1 on the sync target
    // if the resource is encrypted, but will be 0 locally because the device has the decrypted resource.
    static async fullPathForSyncUpload(resource) {
        const plainTextPath = this.fullPath(resource);
        const share = resource.share_id ? await this.shareService().shareById(resource.share_id) : null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        if (!(0, syncInfoUtils_1.getEncryptionEnabled)() || !(0, itemCanBeEncrypted_1.default)(resource, share)) {
            // Normally not possible since itemsThatNeedSync should only return decrypted items
            if (resource.encryption_blob_encrypted)
                throw new Error('Trying to access encrypted resource but encryption is currently disabled');
            return { path: plainTextPath, resource: resource };
        }
        const encryptedPath = this.fullPath(resource, true);
        if (resource.encryption_blob_encrypted)
            return { path: encryptedPath, resource: resource };
        try {
            await this.encryptionService().encryptFile(plainTextPath, encryptedPath, {
                masterKeyId: share && share.master_key_id ? share.master_key_id : '',
            });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new JoplinError_1.default(`Trying to encrypt resource but only metadata is present: ${error.toString()}`, 'fileNotFound');
            }
            throw error;
        }
        const resourceCopy = Object.assign({}, resource);
        resourceCopy.encryption_blob_encrypted = 1;
        return { path: encryptedPath, resource: resourceCopy };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static markupTag(resource, markupLanguage = renderer_1.MarkupLanguage.Markdown) {
        let tagAlt = resource.alt ? resource.alt : resource.title;
        if (!tagAlt)
            tagAlt = '';
        const lines = [];
        if (Resource.isSupportedImageMimeType(resource.mime)) {
            if (markupLanguage === renderer_1.MarkupLanguage.Markdown) {
                lines.push('![');
                lines.push(markdownUtils_1.default.escapeTitleText(tagAlt));
                lines.push(`](:/${resource.id})`);
            }
            else {
                const altHtml = tagAlt ? `alt="${(0, html_1.htmlentities)(tagAlt)}"` : '';
                lines.push(`<img src=":/${resource.id}" ${altHtml}/>`);
            }
        }
        else {
            if (markupLanguage === renderer_1.MarkupLanguage.Markdown) {
                lines.push('[');
                lines.push(markdownUtils_1.default.escapeTitleText(tagAlt));
                lines.push(`](:/${resource.id})`);
            }
            else {
                const altHtml = tagAlt ? `alt="${(0, html_1.htmlentities)(tagAlt)}"` : '';
                lines.push(`<a href=":/${resource.id}" ${altHtml}>${(0, html_1.htmlentities)(tagAlt ? tagAlt : resource.id)}</a>`);
            }
        }
        return lines.join('');
    }
    static internalUrl(resource) {
        return (0, resourceUtils_1.internalUrl)(resource);
    }
    static pathToId(path) {
        return (0, resourceUtils_1.resourcePathToId)(path);
    }
    static async content(resource) {
        return this.fsDriver().readFile(this.fullPath(resource), 'Buffer');
    }
    static isResourceUrl(url) {
        return (0, resourceUtils_1.isResourceUrl)(url);
    }
    static urlToId(url) {
        return (0, resourceUtils_1.resourceUrlToId)(url);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async localState(resourceOrId) {
        return ResourceLocalState_1.default.byResourceId(typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static setLocalStateQueries(resourceOrId, state) {
        const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
        return ResourceLocalState_1.default.saveQueries(Object.assign(Object.assign({}, state), { resource_id: id }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async setLocalState(resourceOrId, state) {
        const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
        await ResourceLocalState_1.default.save(Object.assign(Object.assign({}, state), { resource_id: id }));
    }
    static async needFileSizeSet() {
        return this.modelSelectAll('SELECT * FROM resources WHERE `size` < 0 AND encryption_blob_encrypted = 0');
    }
    // Only set the `size` field and nothing else, not even the update_time
    // This is because it's only necessary to do it once after migration 20
    // and each client does it so there's no need to sync the resource.
    static async setFileSizeOnly(resourceId, fileSize) {
        return this.db().exec('UPDATE resources set `size` = ? WHERE id = ?', [fileSize, resourceId]);
    }
    static async batchDelete(ids, options = {}) {
        const actionLogger = ActionLogger_1.default.from(options.sourceDescription);
        // For resources, there's not really batch deletion since there's the
        // file data to delete too, so each is processed one by one with the
        // file data being deleted last since the metadata deletion call may
        // throw (for example if trying to delete a read-only item).
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const resource = await Resource.load(id);
            if (!resource)
                continue;
            // Log just for the current item.
            const logger = actionLogger.clone();
            logger.addDescription(`title: ${resource.title}`);
            const path = Resource.fullPath(resource);
            await super.batchDelete([id], Object.assign(Object.assign({}, options), { sourceDescription: logger }));
            await this.fsDriver().remove(path);
            await NoteResource_1.default.deleteByResource(id); // Clean up note/resource relationships
            await this.db().exec('DELETE FROM items_normalized WHERE item_id = ?', [id]);
        }
        await ResourceLocalState_1.default.batchDelete(ids, { sourceDescription: actionLogger });
    }
    static async markForDownload(resourceId) {
        // Insert the row only if it's not already there
        const t = Date.now();
        await this.db().exec('INSERT INTO resources_to_download (resource_id, updated_time, created_time) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM resources_to_download WHERE resource_id = ?)', [resourceId, t, t, resourceId]);
    }
    static async downloadedButEncryptedBlobCount(excludedIds = null) {
        let excludedSql = '';
        if (excludedIds && excludedIds.length) {
            excludedSql = `AND resource_id NOT IN (${this.escapeIdsForSql(excludedIds)})`;
        }
        const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resource_local_states
			WHERE fetch_status = ?
			AND resource_id IN (SELECT id FROM resources WHERE encryption_blob_encrypted = 1)
			${excludedSql}
		`, [Resource.FETCH_STATUS_DONE]);
        return r ? r.total : 0;
    }
    static async downloadStatusCounts(status) {
        const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resource_local_states
			WHERE fetch_status = ?
		`, [status]);
        return r ? r.total : 0;
    }
    static async createdLocallyCount() {
        const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resources
			WHERE id NOT IN
			(SELECT resource_id FROM resource_local_states)
		`);
        return r ? r.total : 0;
    }
    static fetchStatusToLabel(status) {
        if (status === Resource.FETCH_STATUS_IDLE)
            return (0, locale_1._)('Not downloaded');
        if (status === Resource.FETCH_STATUS_STARTED)
            return (0, locale_1._)('Downloading');
        if (status === Resource.FETCH_STATUS_DONE)
            return (0, locale_1._)('Downloaded');
        if (status === Resource.FETCH_STATUS_ERROR)
            return (0, locale_1._)('Error');
        throw new Error(`Invalid status: ${status}`);
    }
    static async updateResourceBlobContent(resourceId, newBlobFilePath) {
        const resource = await Resource.load(resourceId);
        await this.requireIsReady(resource);
        const fileStat = await this.fsDriver().stat(newBlobFilePath);
        // We first save the resource metadata because this can throw, for
        // example if modifying a resource that is read-only
        const now = Date.now();
        const result = await Resource.save({
            id: resource.id,
            size: fileStat.size,
            updated_time: now,
            blob_updated_time: now,
        }, {
            autoTimestamp: false,
        });
        // If the above call has succeeded, we save the data blob
        await this.fsDriver().copy(newBlobFilePath, Resource.fullPath(resource));
        return result;
    }
    static async resourceBlobContent(resourceId, encoding = 'Buffer') {
        const resource = await Resource.load(resourceId);
        await this.requireIsReady(resource);
        return await this.fsDriver().readFile(Resource.fullPath(resource), encoding);
    }
    static async duplicateResource(resourceId) {
        const resource = await Resource.load(resourceId);
        const localState = await Resource.localState(resource);
        let newResource = Object.assign({}, resource);
        delete newResource.id;
        delete newResource.is_shared;
        delete newResource.share_id;
        newResource = await Resource.save(newResource);
        const newLocalState = Object.assign({}, localState);
        newLocalState.resource_id = newResource.id;
        delete newLocalState.id;
        await Resource.setLocalState(newResource, newLocalState);
        const sourcePath = Resource.fullPath(resource);
        if (await this.fsDriver().exists(sourcePath)) {
            await this.fsDriver().copy(sourcePath, Resource.fullPath(newResource));
        }
        return newResource;
    }
    static async resourceConflictFolderId() {
        const folder = await this.resourceConflictFolder();
        return folder.id;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async resourceConflictFolder() {
        const conflictFolderTitle = (0, locale_1._)('Conflicts (attachments)');
        const Folder = this.getClass('Folder');
        const folder = await Folder.loadByTitle(conflictFolderTitle);
        if (!folder || folder.parent_id) {
            return Folder.save({ title: conflictFolderTitle });
        }
        return folder;
    }
    static mustHandleConflict(local, remote) {
        // That shouldn't happen so throw an exception
        if (local.id !== remote.id)
            throw new Error('Cannot handle conflict for two different resources');
        // If the content has changed, we need to handle the conflict
        if (local.blob_updated_time !== remote.blob_updated_time)
            return true;
        // If nothing has been changed, or if only the metadata has been
        // changed, we just keep the remote version. Most of the resource
        // metadata is not user-editable so there won't be any data loss. Such a
        // conflict might happen for example if a resource is OCRed by two
        // different clients.
        return false;
    }
    static async createConflictResourceNote(resource) {
        const Note = this.getClass('Note');
        const conflictResource = await Resource.duplicateResource(resource.id);
        await Note.save({
            title: (0, locale_1._)('Attachment conflict: "%s"', resource.title),
            body: (0, locale_1._)('There was a [conflict](%s) on the attachment below.\n\n%s', 'https://joplinapp.org/help/apps/conflict', Resource.markupTag(conflictResource)),
            parent_id: await this.resourceConflictFolderId(),
        }, { changeSource: ItemChange_1.default.SOURCE_SYNC });
    }
    static baseNeedOcrQuery(selectSql, supportedMimeTypes) {
        return {
            sql: `
				SELECT ${selectSql}
				FROM resources
				WHERE
					(ocr_status = ? or ocr_status = ?) AND
					encryption_applied = 0 AND
					mime IN ('${supportedMimeTypes.join('\',\'')}')
			`,
            params: [
                types_1.ResourceOcrStatus.Todo,
                types_1.ResourceOcrStatus.Processing,
            ],
        };
    }
    static async needOcrCount(supportedMimeTypes) {
        const query = this.baseNeedOcrQuery('count(*) as total', supportedMimeTypes);
        const r = await this.db().selectOne(query.sql, query.params);
        return r ? r['total'] : 0;
    }
    static async needOcr(supportedMimeTypes, skippedResourceIds, limit, options) {
        const query = this.baseNeedOcrQuery(this.selectFields(options), supportedMimeTypes);
        const skippedResourcesSql = skippedResourceIds.length ? `AND resources.id NOT IN (${this.escapeIdsForSql(skippedResourceIds)})` : '';
        return await this.db().selectAll(`
			${query.sql}
			${skippedResourcesSql}			
			ORDER BY updated_time DESC
			LIMIT ${limit}
		`, query.params);
    }
    static async resetOcrStatus(resourceId) {
        await Resource.save({
            id: resourceId,
            ocr_error: '',
            ocr_text: '',
            ocr_status: types_1.ResourceOcrStatus.Todo,
        });
    }
    static serializeOcrDetails(details) {
        if (!details || !details.length)
            return '';
        return JSON.stringify(details);
    }
    static unserializeOcrDetails(s) {
        if (!s)
            return null;
        try {
            const r = JSON.parse(s);
            if (!r)
                return null;
            if (!Array.isArray(r))
                throw new Error('OCR details are not valid (not an array');
            return r;
        }
        catch (error) {
            error.message = `Could not unserialized OCR data: ${error.message}`;
            throw error;
        }
    }
    static async resourceOcrTextsByIds(ids) {
        if (!ids.length)
            return [];
        ids = (0, array_1.unique)(ids);
        return this.modelSelectAll(`SELECT id, ocr_text FROM resources WHERE id IN (${this.escapeIdsForSql(ids)})`);
    }
    static async allForNormalization(updatedTime, id, limit = 100, options = null) {
        const makeQuery = (useRowValue) => {
            const whereSql = useRowValue ? '(updated_time, id) > (?, ?)' : 'updated_time > ?';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
            const params = [updatedTime];
            if (useRowValue) {
                params.push(id);
            }
            params.push(types_1.ResourceOcrStatus.Done);
            params.push(limit);
            return {
                sql: `
					SELECT ${this.selectFields(options)} FROM resources
					WHERE ${whereSql}
					AND ocr_text != ''
					AND ocr_status = ?
					ORDER BY updated_time ASC, id ASC
					LIMIT ?
				`,
                params,
            };
        };
        // We use a row value in this query, and that's not supported on certain
        // Android devices (API level <= 24). So if the query fails, we fallback
        // to a non-row value query. Although it may be inaccurate in some cases
        // it wouldn't be a critical issue (some OCRed resources may not be part
        // of the search engine results) and it means we can keep supporting old
        // Android devices.
        try {
            const r = await this.modelSelectAll(makeQuery(true));
            return r;
        }
        catch (error) {
            if ((0, isSqliteSyntaxError_1.default)(error)) {
                const r = await this.modelSelectAll(makeQuery(false));
                return r;
            }
            else {
                throw error;
            }
        }
    }
    static async save(o, options = null) {
        const resource = Object.assign({}, o);
        const isNew = this.isNew(o, options);
        if (isNew) {
            const now = Date.now();
            options = Object.assign(Object.assign({}, options), { autoTimestamp: false });
            if (!resource.created_time)
                resource.created_time = now;
            if (!resource.updated_time)
                resource.updated_time = now;
            if (!resource.blob_updated_time)
                resource.blob_updated_time = now;
        }
        const output = await super.save(resource, options);
        eventManager_1.default.emit(isNew ? eventManager_1.EventName.ResourceCreate : eventManager_1.EventName.ResourceChange, { id: output.id });
        return output;
    }
    static load(id, options = null) {
        return super.load(id, options);
    }
}
Resource.IMAGE_MAX_DIMENSION = 1920;
Resource.FETCH_STATUS_IDLE = 0;
Resource.FETCH_STATUS_STARTED = 1;
Resource.FETCH_STATUS_DONE = 2;
Resource.FETCH_STATUS_ERROR = 3;
Resource.shareService_ = null;
exports.default = Resource;
