const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteResource = require('lib/models/NoteResource.js');
const Setting = require('lib/models/Setting.js');
const ArrayUtils = require('lib/ArrayUtils.js');
const pathUtils = require('lib/path-utils.js');
const { mime } = require('lib/mime-utils.js');
const { filename, safeFilename } = require('lib/path-utils.js');
const { FsDriverDummy } = require('lib/fs-driver-dummy.js');
const markdownUtils = require('lib/markdownUtils');
const JoplinError = require('lib/JoplinError');

class Resource extends BaseItem {

	static tableName() {
		return 'resources';
	}

	static modelType() {
		return BaseModel.TYPE_RESOURCE;
	}

	static encryptionService() {
		if (!this.encryptionService_) throw new Error('Resource.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	static isSupportedImageMimeType(type) {
		const imageMimeTypes = ["image/jpg", "image/jpeg", "image/png", "image/gif", "image/svg+xml"];
		return imageMimeTypes.indexOf(type.toLowerCase()) >= 0;
	}

	static fsDriver() {
		if (!Resource.fsDriver_) Resource.fsDriver_ = new FsDriverDummy();
		return Resource.fsDriver_;
	}

	static filename(resource, encryptedBlob = false) {
		let extension = encryptedBlob ? 'crypted' : resource.file_extension;
		if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
		extension = extension ? ('.' + extension) : '';
		return resource.id + extension;
	}

	static serializeForSyncExcludedKeys() {
		return ['fetch_status', 'fetch_error'];
	}

	static friendlyFilename(resource) {
		let output = safeFilename(resource.title); // Make sure not to allow spaces or any special characters as it's not supported in HTTP headers
		if (!output) output = resource.id;
		let extension = resource.file_extension;
		if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
		extension = extension ? ('.' + extension) : '';
		return output + extension;
	}

	static fullPath(resource, encryptedBlob = false) {
		return Setting.value('resourceDir') + '/' + this.filename(resource, encryptedBlob);
	}

	// For resources, we need to decrypt the item (metadata) and the resource binary blob.
	static async decrypt(item) {
		// The item might already be decrypted but not the blob (for instance if it crashes while
		// decrypting the blob or was otherwise interrupted).
		const decryptedItem = item.encryption_cipher_text ? await super.decrypt(item) : Object.assign({}, item);
		if (!decryptedItem.encryption_blob_encrypted) return decryptedItem;

		const plainTextPath = this.fullPath(decryptedItem);
		const encryptedPath = this.fullPath(decryptedItem, true);
		const noExtPath = pathUtils.dirname(encryptedPath) + '/' + pathUtils.filename(encryptedPath);
		
		// When the resource blob is downloaded by the synchroniser, it's initially a file with no
		// extension (since it's encrypted, so we don't know its extension). So here rename it
		// to a file with a ".crypted" extension so that it's better identified, and then decrypt it.
		// Potentially plainTextPath is also a path with no extension if it's an unknown mime type.
		if (await this.fsDriver().exists(noExtPath)) {
			await this.fsDriver().move(noExtPath, encryptedPath);
		}

		try {
			// const stat = await this.fsDriver().stat(encryptedPath);
			await this.encryptionService().decryptFile(encryptedPath, plainTextPath, {
				// onProgress: (progress) => {
				// 	console.info('Decryption: ', progress.doneSize / stat.size);
				// },
			});
		} catch (error) {
			if (error.code === 'invalidIdentifier') {
				// As the identifier is invalid it most likely means that this is not encrypted data
				// at all. It can happen for example when there's a crash between the moment the data
				// is decrypted and the resource item is updated.
				this.logger().warn('Found a resource that was most likely already decrypted but was marked as encrypted. Marked it as decrypted: ' + item.id)
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
	static async fullPathForSyncUpload(resource) {
		const plainTextPath = this.fullPath(resource);

		if (!Setting.value('encryption.enabled')) {
			// Normally not possible since itemsThatNeedSync should only return decrypted items
			if (!!resource.encryption_blob_encrypted) throw new Error('Trying to access encrypted resource but encryption is currently disabled');
			return { path: plainTextPath, resource: resource };
		}

		const encryptedPath = this.fullPath(resource, true);
		if (resource.encryption_blob_encrypted) return { path: encryptedPath, resource: resource };

		try {
			// const stat = await this.fsDriver().stat(plainTextPath);
			await this.encryptionService().encryptFile(plainTextPath, encryptedPath, {
				// onProgress: (progress) => {
				// 	console.info(progress.doneSize / stat.size);
				// },
			});
		} catch (error) {
			if (error.code === 'ENOENT') throw new JoplinError('File not found:' + error.toString(), 'fileNotFound');
			throw error;
		}

		const resourceCopy = Object.assign({}, resource);
		resourceCopy.encryption_blob_encrypted = 1;
		return { path: encryptedPath, resource: resourceCopy };
	}

	static markdownTag(resource) {
		let tagAlt = resource.alt ? resource.alt : resource.title;
		if (!tagAlt) tagAlt = '';
		let lines = [];
		if (Resource.isSupportedImageMimeType(resource.mime)) {
			lines.push("![");
			lines.push(markdownUtils.escapeLinkText(tagAlt));
			lines.push("](:/" + resource.id + ")");
		} else {
			lines.push("[");
			lines.push(markdownUtils.escapeLinkText(tagAlt));
			lines.push("](:/" + resource.id + ")");
		}
		return lines.join('');
	}

	static internalUrl(resource) {
		return ':/' + resource.id;
	}

	static pathToId(path) {
		return filename(path);
	}

	static async content(resource) {
		return this.fsDriver().readFile(this.fullPath(resource), 'Buffer');
	}

	static setContent(resource, content) {
		return this.fsDriver().writeBinaryFile(this.fullPath(resource), content);
	}

	static isResourceUrl(url) {
		return url && url.length === 34 && url[0] === ':' && url[1] === '/';
	}

	static urlToId(url) {
		if (!this.isResourceUrl(url)) throw new Error('Not a valid resource URL: ' + url);
		return url.substr(2);
	}

	static async batchDelete(ids, options = null) {
		// For resources, there's not really batch deleting since there's the file data to delete
		// too, so each is processed one by one with the item being deleted last (since the db
		// call is the less likely to fail).
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const resource = await Resource.load(id);
			if (!resource) continue;

			const path = Resource.fullPath(resource);
			await this.fsDriver().remove(path);
			await super.batchDelete([id], options);
			await NoteResource.deleteByResource(id); // Clean up note/resource relationships
		}
	}

}

Resource.IMAGE_MAX_DIMENSION = 1920;

Resource.FETCH_STATUS_IDLE = 0;
Resource.FETCH_STATUS_STARTED = 1;
Resource.FETCH_STATUS_DONE = 2;
Resource.FETCH_STATUS_ERROR = 3;

module.exports = Resource;