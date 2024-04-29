import BaseModel, { DeleteOptions } from '../BaseModel';
import BaseItem from './BaseItem';
import ItemChange from './ItemChange';
import NoteResource from './NoteResource';
import Setting from './Setting';
import markdownUtils from '../markdownUtils';
import { _ } from '../locale';
import { ResourceEntity, ResourceLocalStateEntity, ResourceOcrStatus, SqlQuery } from '../services/database/types';
import ResourceLocalState from './ResourceLocalState';
import * as pathUtils from '../path-utils';
import { safeFilename } from '../path-utils';
const { mime } = require('../mime-utils.js');
const { FsDriverDummy } = require('../fs-driver-dummy.js');
import JoplinError from '../JoplinError';
import itemCanBeEncrypted from './utils/itemCanBeEncrypted';
import { getEncryptionEnabled } from '../services/synchronizer/syncInfoUtils';
import ShareService from '../services/share/ShareService';
import { LoadOptions } from './utils/types';
import { SaveOptions } from './utils/types';
import { MarkupLanguage } from '@joplin/renderer';
import { htmlentities } from '@joplin/utils/html';
import { RecognizeResultLine } from '../services/ocr/utils/types';
import eventManager, { EventName } from '../eventManager';
import { unique } from '../array';
import ActionLogger from '../utils/ActionLogger';
import isSqliteSyntaxError from '../services/database/isSqliteSyntaxError';
import { internalUrl, isResourceUrl, isSupportedImageMimeType, resourceFilename, resourceFullPath, resourcePathToId, resourceRelativePath, resourceUrlToId } from './utils/resourceUtils';

export const resourceOcrStatusToString = (status: ResourceOcrStatus) => {
	const s = {
		[ResourceOcrStatus.Todo]: _('Idle'),
		[ResourceOcrStatus.Processing]: _('Processing'),
		[ResourceOcrStatus.Error]: _('Error'),
		[ResourceOcrStatus.Done]: _('Done'),
	};

	return s[status];
};

export default class Resource extends BaseItem {

	public static IMAGE_MAX_DIMENSION = 1920;

	public static FETCH_STATUS_IDLE = 0;
	public static FETCH_STATUS_STARTED = 1;
	public static FETCH_STATUS_DONE = 2;
	public static FETCH_STATUS_ERROR = 3;

	public static shareService_: ShareService = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static fsDriver_: any;

	public static tableName() {
		return 'resources';
	}

	public static modelType() {
		return BaseModel.TYPE_RESOURCE;
	}

	public static encryptionService() {
		if (!this.encryptionService_) throw new Error('Resource.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	protected static shareService() {
		if (!this.shareService_) throw new Error('Resource.shareService_ is not set!!');
		return this.shareService_;
	}

	public static isSupportedImageMimeType(type: string) {
		return isSupportedImageMimeType(type);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static fetchStatuses(resourceIds: string[]): Promise<any[]> {
		if (!resourceIds.length) return Promise.resolve([]);
		return this.db().selectAll(`SELECT resource_id, fetch_status FROM resource_local_states WHERE resource_id IN ("${resourceIds.join('","')}")`);
	}

	public static sharedResourceIds(): Promise<string[]> {
		return this.db().selectAllFields('SELECT id FROM resources WHERE is_shared = 1', [], 'id');
	}

	public static errorFetchStatuses() {
		return this.db().selectAll(`
			SELECT title AS resource_title, resource_id, fetch_error
			FROM resource_local_states
			LEFT JOIN resources ON resources.id = resource_local_states.resource_id
			WHERE fetch_status = ?
		`, [Resource.FETCH_STATUS_ERROR]);
	}

	public static needToBeFetched(resourceDownloadMode: string = null, limit: number = null) {
		const sql = ['SELECT * FROM resources WHERE encryption_applied = 0 AND id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = ?)'];
		if (resourceDownloadMode !== 'always') {
			sql.push('AND resources.id IN (SELECT resource_id FROM resources_to_download)');
		}
		sql.push('ORDER BY updated_time DESC');
		if (limit !== null) sql.push(`LIMIT ${limit}`);
		return this.modelSelectAll(sql.join(' '), [Resource.FETCH_STATUS_IDLE]);
	}

	public static async resetStartedFetchStatus() {
		return await this.db().exec('UPDATE resource_local_states SET fetch_status = ? WHERE fetch_status = ?', [Resource.FETCH_STATUS_IDLE, Resource.FETCH_STATUS_STARTED]);
	}

	public static async resetFetchErrorStatus(resourceId: string) {
		await this.db().exec('UPDATE resource_local_states SET fetch_status = ?, fetch_error = "" WHERE resource_id = ?', [Resource.FETCH_STATUS_IDLE, resourceId]);
		await this.resetOcrStatus(resourceId);
	}

	public static fsDriver() {
		if (!Resource.fsDriver_) Resource.fsDriver_ = new FsDriverDummy();
		return Resource.fsDriver_;
	}

	// DEPRECATED IN FAVOUR OF friendlySafeFilename()
	public static friendlyFilename(resource: ResourceEntity) {
		let output = safeFilename(resource.title); // Make sure not to allow spaces or any special characters as it's not supported in HTTP headers
		if (!output) output = resource.id;
		let extension = resource.file_extension;
		if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
		extension = extension ? `.${extension}` : '';
		return output + extension;
	}

	public static baseDirectoryPath() {
		return Setting.value('resourceDir');
	}

	public static baseRelativeDirectoryPath() {
		return Setting.value('resourceDirName');
	}

	public static filename(resource: ResourceEntity, encryptedBlob = false) {
		return resourceFilename(resource, encryptedBlob);
	}

	public static friendlySafeFilename(resource: ResourceEntity) {
		let ext = resource.file_extension;
		if (!ext) ext = resource.mime ? mime.toFileExtension(resource.mime) : '';
		const safeExt = ext ? pathUtils.safeFileExtension(ext).toLowerCase() : '';
		let title = resource.title ? resource.title : resource.id;
		if (safeExt && pathUtils.fileExtension(title).toLowerCase() === safeExt) title = pathUtils.filename(title);
		return pathUtils.friendlySafeFilename(title) + (safeExt ? `.${safeExt}` : '');
	}

	public static relativePath(resource: ResourceEntity, encryptedBlob = false) {
		return resourceRelativePath(resource, this.baseRelativeDirectoryPath(), encryptedBlob);
	}

	public static fullPath(resource: ResourceEntity, encryptedBlob = false) {
		return resourceFullPath(resource, this.baseDirectoryPath(), encryptedBlob);
	}

	public static async isReady(resource: ResourceEntity) {
		const r = await this.readyStatus(resource);
		return r === 'ok';
	}

	public static async readyStatus(resource: ResourceEntity) {
		const ls = await this.localState(resource);
		if (!resource) return 'notFound';
		if (ls.fetch_status !== Resource.FETCH_STATUS_DONE) return 'notDownloaded';
		if (resource.encryption_blob_encrypted) return 'encrypted';
		return 'ok';
	}

	public static async requireIsReady(resource: ResourceEntity) {
		const readyStatus = await Resource.readyStatus(resource);
		if (readyStatus !== 'ok') throw new Error(`Resource is not ready. Status: ${readyStatus}`);
	}

	// For resources, we need to decrypt the item (metadata) and the resource binary blob.
	public static async decrypt(item: ResourceEntity) {
		// The item might already be decrypted but not the blob (for instance if it crashes while
		// decrypting the blob or was otherwise interrupted).
		const decryptedItem = item.encryption_cipher_text ? await super.decrypt(item) : { ...item };
		if (!decryptedItem.encryption_blob_encrypted) return decryptedItem;

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
		} catch (error) {
			if (error.code === 'invalidIdentifier') {
				// As the identifier is invalid it most likely means that this is not encrypted data
				// at all. It can happen for example when there's a crash between the moment the data
				// is decrypted and the resource item is updated.
				this.logger().warn(`Found a resource that was most likely already decrypted but was marked as encrypted. Marked it as decrypted: ${item.id}`);
				this.fsDriver().move(encryptedPath, plainTextPath);
			} else {
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
	public static async fullPathForSyncUpload(resource: ResourceEntity) {
		const plainTextPath = this.fullPath(resource);

		const share = resource.share_id ? await this.shareService().shareById(resource.share_id) : null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		if (!getEncryptionEnabled() || !itemCanBeEncrypted(resource as any, share)) {
			// Normally not possible since itemsThatNeedSync should only return decrypted items
			if (resource.encryption_blob_encrypted) throw new Error('Trying to access encrypted resource but encryption is currently disabled');
			return { path: plainTextPath, resource: resource };
		}

		const encryptedPath = this.fullPath(resource, true);
		if (resource.encryption_blob_encrypted) return { path: encryptedPath, resource: resource };

		try {
			await this.encryptionService().encryptFile(plainTextPath, encryptedPath, {
				masterKeyId: share && share.master_key_id ? share.master_key_id : '',
			});
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new JoplinError(
					`Trying to encrypt resource but only metadata is present: ${error.toString()}`, 'fileNotFound',
				);
			}
			throw error;
		}

		const resourceCopy = { ...resource };
		resourceCopy.encryption_blob_encrypted = 1;
		return { path: encryptedPath, resource: resourceCopy };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static markupTag(resource: any, markupLanguage: MarkupLanguage = MarkupLanguage.Markdown) {
		let tagAlt = resource.alt ? resource.alt : resource.title;
		if (!tagAlt) tagAlt = '';
		const lines = [];
		if (Resource.isSupportedImageMimeType(resource.mime)) {
			if (markupLanguage === MarkupLanguage.Markdown) {
				lines.push('![');
				lines.push(markdownUtils.escapeTitleText(tagAlt));
				lines.push(`](:/${resource.id})`);
			} else {
				const altHtml = tagAlt ? `alt="${htmlentities(tagAlt)}"` : '';
				lines.push(`<img src=":/${resource.id}" ${altHtml}/>`);
			}
		} else {
			if (markupLanguage === MarkupLanguage.Markdown) {
				lines.push('[');
				lines.push(markdownUtils.escapeTitleText(tagAlt));
				lines.push(`](:/${resource.id})`);
			} else {
				const altHtml = tagAlt ? `alt="${htmlentities(tagAlt)}"` : '';
				lines.push(`<a href=":/${resource.id}" ${altHtml}>${htmlentities(tagAlt ? tagAlt : resource.id)}</a>`);
			}
		}
		return lines.join('');
	}

	public static internalUrl(resource: ResourceEntity) {
		return internalUrl(resource);
	}

	public static pathToId(path: string) {
		return resourcePathToId(path);
	}

	public static async content(resource: ResourceEntity) {
		return this.fsDriver().readFile(this.fullPath(resource), 'Buffer');
	}

	public static isResourceUrl(url: string) {
		return isResourceUrl(url);
	}

	public static urlToId(url: string) {
		return resourceUrlToId(url);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async localState(resourceOrId: any): Promise<ResourceLocalStateEntity> {
		return ResourceLocalState.byResourceId(typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setLocalStateQueries(resourceOrId: any, state: ResourceLocalStateEntity) {
		const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
		return ResourceLocalState.saveQueries({ ...state, resource_id: id });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async setLocalState(resourceOrId: any, state: ResourceLocalStateEntity) {
		const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
		await ResourceLocalState.save({ ...state, resource_id: id });
	}

	public static async needFileSizeSet() {
		return this.modelSelectAll('SELECT * FROM resources WHERE `size` < 0 AND encryption_blob_encrypted = 0');
	}

	// Only set the `size` field and nothing else, not even the update_time
	// This is because it's only necessary to do it once after migration 20
	// and each client does it so there's no need to sync the resource.
	public static async setFileSizeOnly(resourceId: string, fileSize: number) {
		return this.db().exec('UPDATE resources set `size` = ? WHERE id = ?', [fileSize, resourceId]);
	}

	public static async batchDelete(ids: string[], options: DeleteOptions = {}) {
		const actionLogger = ActionLogger.from(options.sourceDescription);

		// For resources, there's not really batch deletion since there's the
		// file data to delete too, so each is processed one by one with the
		// file data being deleted last since the metadata deletion call may
		// throw (for example if trying to delete a read-only item).
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const resource = await Resource.load(id);
			if (!resource) continue;

			// Log just for the current item.
			const logger = actionLogger.clone();
			logger.addDescription(`title: ${resource.title}`);

			const path = Resource.fullPath(resource);
			await super.batchDelete([id], {
				...options,
				sourceDescription: logger,
			});
			await this.fsDriver().remove(path);
			await NoteResource.deleteByResource(id); // Clean up note/resource relationships
			await this.db().exec('DELETE FROM items_normalized WHERE item_id = ?', [id]);
		}

		await ResourceLocalState.batchDelete(ids, { sourceDescription: actionLogger });
	}

	public static async markForDownload(resourceId: string) {
		// Insert the row only if it's not already there
		const t = Date.now();
		await this.db().exec('INSERT INTO resources_to_download (resource_id, updated_time, created_time) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM resources_to_download WHERE resource_id = ?)', [resourceId, t, t, resourceId]);
	}

	public static async downloadedButEncryptedBlobCount(excludedIds: string[] = null) {
		let excludedSql = '';
		if (excludedIds && excludedIds.length) {
			excludedSql = `AND resource_id NOT IN ("${excludedIds.join('","')}")`;
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

	public static async downloadStatusCounts(status: number) {
		const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resource_local_states
			WHERE fetch_status = ?
		`, [status]);

		return r ? r.total : 0;
	}

	public static async createdLocallyCount() {
		const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resources
			WHERE id NOT IN
			(SELECT resource_id FROM resource_local_states)
		`);

		return r ? r.total : 0;
	}

	public static fetchStatusToLabel(status: number) {
		if (status === Resource.FETCH_STATUS_IDLE) return _('Not downloaded');
		if (status === Resource.FETCH_STATUS_STARTED) return _('Downloading');
		if (status === Resource.FETCH_STATUS_DONE) return _('Downloaded');
		if (status === Resource.FETCH_STATUS_ERROR) return _('Error');
		throw new Error(`Invalid status: ${status}`);
	}

	public static async updateResourceBlobContent(resourceId: string, newBlobFilePath: string) {
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

	public static async resourceBlobContent(resourceId: string, encoding = 'Buffer') {
		const resource = await Resource.load(resourceId);
		await this.requireIsReady(resource);
		return await this.fsDriver().readFile(Resource.fullPath(resource), encoding);
	}

	public static async duplicateResource(resourceId: string): Promise<ResourceEntity> {
		const resource = await Resource.load(resourceId);
		const localState = await Resource.localState(resource);

		let newResource: ResourceEntity = { ...resource };
		delete newResource.id;
		delete newResource.is_shared;
		delete newResource.share_id;
		newResource = await Resource.save(newResource);

		const newLocalState = { ...localState };
		newLocalState.resource_id = newResource.id;
		delete newLocalState.id;

		await Resource.setLocalState(newResource, newLocalState);

		const sourcePath = Resource.fullPath(resource);
		if (await this.fsDriver().exists(sourcePath)) {
			await this.fsDriver().copy(sourcePath, Resource.fullPath(newResource));
		}

		return newResource;
	}

	public static async resourceConflictFolderId(): Promise<string> {
		const folder = await this.resourceConflictFolder();
		return folder.id;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static async resourceConflictFolder(): Promise<any> {
		const conflictFolderTitle = _('Conflicts (attachments)');
		const Folder = this.getClass('Folder');

		const folder = await Folder.loadByTitle(conflictFolderTitle);
		if (!folder || folder.parent_id) {
			return Folder.save({ title: conflictFolderTitle });
		}

		return folder;
	}

	public static mustHandleConflict(local: ResourceEntity, remote: ResourceEntity) {
		// That shouldn't happen so throw an exception
		if (local.id !== remote.id) throw new Error('Cannot handle conflict for two different resources');

		// If the content has changed, we need to handle the conflict
		if (local.blob_updated_time !== remote.blob_updated_time) return true;

		// If nothing has been changed, or if only the metadata has been
		// changed, we just keep the remote version. Most of the resource
		// metadata is not user-editable so there won't be any data loss. Such a
		// conflict might happen for example if a resource is OCRed by two
		// different clients.
		return false;
	}

	public static async createConflictResourceNote(resource: ResourceEntity) {
		const Note = this.getClass('Note');
		const conflictResource = await Resource.duplicateResource(resource.id);

		await Note.save({
			title: _('Attachment conflict: "%s"', resource.title),
			body: _('There was a [conflict](%s) on the attachment below.\n\n%s', 'https://joplinapp.org/help/apps/conflict', Resource.markupTag(conflictResource)),
			parent_id: await this.resourceConflictFolderId(),
		}, { changeSource: ItemChange.SOURCE_SYNC });
	}

	private static baseNeedOcrQuery(selectSql: string, supportedMimeTypes: string[]): SqlQuery {
		return {
			sql: `
				SELECT ${selectSql}
				FROM resources
				WHERE
					ocr_status = ? AND
					encryption_applied = 0 AND
					mime IN ("${supportedMimeTypes.join('","')}")
			`,
			params: [
				ResourceOcrStatus.Todo,
			],
		};
	}

	public static async needOcrCount(supportedMimeTypes: string[]): Promise<number> {
		const query = this.baseNeedOcrQuery('count(*) as total', supportedMimeTypes);
		const r = await this.db().selectOne(query.sql, query.params);
		return r ? r['total'] : 0;
	}

	public static async needOcr(supportedMimeTypes: string[], skippedResourceIds: string[], limit: number, options: LoadOptions): Promise<ResourceEntity[]> {
		const query = this.baseNeedOcrQuery(this.selectFields(options), supportedMimeTypes);
		const skippedResourcesSql = skippedResourceIds.length ? `AND resources.id NOT IN  ("${skippedResourceIds.join('","')}")` : '';

		return await this.db().selectAll(`
			${query.sql}
			${skippedResourcesSql}			
			ORDER BY updated_time DESC
			LIMIT ${limit}
		`, query.params);
	}

	private static async resetOcrStatus(resourceId: string) {
		await Resource.save({
			id: resourceId,
			ocr_error: '',
			ocr_text: '',
			ocr_status: ResourceOcrStatus.Todo,
		});
	}

	public static serializeOcrDetails(details: RecognizeResultLine[]) {
		if (!details || !details.length) return '';
		return JSON.stringify(details);
	}

	public static unserializeOcrDetails(s: string): RecognizeResultLine[] | null {
		if (!s) return null;
		try {
			const r = JSON.parse(s);
			if (!r) return null;
			if (!Array.isArray(r)) throw new Error('OCR details are not valid (not an array');
			return r;
		} catch (error) {
			error.message = `Could not unserialized OCR data: ${error.message}`;
			throw error;
		}
	}

	public static async resourceOcrTextsByIds(ids: string[]): Promise<ResourceEntity[]> {
		if (!ids.length) return [];
		ids = unique(ids);
		return this.modelSelectAll(`SELECT id, ocr_text FROM resources WHERE id IN ("${ids.join('","')}")`);
	}

	public static async allForNormalization(updatedTime: number, id: string, limit = 100, options: LoadOptions = null) {
		const makeQuery = (useRowValue: boolean): SqlQuery => {
			const whereSql = useRowValue ? '(updated_time, id) > (?, ?)' : 'updated_time > ?';

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const params: any[] = [updatedTime];
			if (useRowValue) {
				params.push(id);
			}
			params.push(ResourceOcrStatus.Done);
			params.push(limit);

			return {
				sql: `
					SELECT ${this.selectFields(options)} FROM resources
					WHERE ${whereSql}
					AND ocr_text != ""
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
		} catch (error) {
			if (isSqliteSyntaxError(error)) {
				const r = await this.modelSelectAll(makeQuery(false));
				return r;
			} else {
				throw error;
			}
		}
	}

	public static async save(o: ResourceEntity, options: SaveOptions = null): Promise<ResourceEntity> {
		const resource = { ...o };

		const isNew = this.isNew(o, options);

		if (isNew) {
			const now = Date.now();
			options = { ...options, autoTimestamp: false };
			if (!resource.created_time) resource.created_time = now;
			if (!resource.updated_time) resource.updated_time = now;
			if (!resource.blob_updated_time) resource.blob_updated_time = now;
		}

		const output = await super.save(resource, options);
		if (isNew) eventManager.emit(EventName.ResourceCreate);
		return output;
	}

	public static load(id: string, options: LoadOptions = null): Promise<ResourceEntity> {
		return super.load(id, options);
	}

}
