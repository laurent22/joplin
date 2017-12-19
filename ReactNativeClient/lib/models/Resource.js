const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const Setting = require('lib/models/Setting.js');
const ArrayUtils = require('lib/ArrayUtils.js');
const pathUtils = require('lib/path-utils.js');
const { mime } = require('lib/mime-utils.js');
const { filename } = require('lib/path-utils.js');
const { FsDriverDummy } = require('lib/fs-driver-dummy.js');
const { markdownUtils } = require('lib/markdown-utils.js');

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
		const imageMimeTypes = ["image/jpg", "image/jpeg", "image/png", "image/gif"];
		return imageMimeTypes.indexOf(type.toLowerCase()) >= 0;
	}

	static fsDriver() {
		if (!Resource.fsDriver_) Resource.fsDriver_ = new FsDriverDummy();
		return Resource.fsDriver_;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');		
		//fieldNames = ArrayUtils.removeElement(fieldNames, 'encryption_blob_encrypted');
		return super.serialize(item, 'resource', fieldNames);
	}

	static filename(resource, encryptedBlob = false) {
		let extension = encryptedBlob ? 'crypted' : resource.file_extension;
		if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
		extension = extension ? ('.' + extension) : '';
		return resource.id + extension;
	}

	static fullPath(resource, encryptedBlob = false) {
		return Setting.value('resourceDir') + '/' + this.filename(resource, encryptedBlob);
	}

	// For resources, we need to decrypt the item (metadata) and the resource binary blob.
	static async decrypt(item) {
		const decryptedItem = await super.decrypt(item);
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

		await this.encryptionService().decryptFile(encryptedPath, plainTextPath);
		item.encryption_blob_encrypted = 0;
		return Resource.save(decryptedItem, { autoTimestamp: false });
	}


	// Prepare the resource by encrypting it if needed.
	// The call returns the path to the physical file AND the resource object
	// which may have been modified. So the caller should update their copy with this.
	static async fullPathForSyncUpload(resource) {
		const plainTextPath = this.fullPath(resource);

		if (!Setting.value('encryption.enabled')) {
			if (resource.encryption_blob_encrypted) {
				resource.encryption_blob_encrypted = 0;
				await Resource.save(resource, { autoTimestamp: false });
			}
			return { path: plainTextPath, resource: resource };
		}

		const encryptedPath = this.fullPath(resource, true);
		if (resource.encryption_blob_encrypted) return { path: encryptedPath, resource: resource };
		await this.encryptionService().encryptFile(plainTextPath, encryptedPath);

		resource.encryption_blob_encrypted = 1;
		await Resource.save(resource, { autoTimestamp: false });

		return { path: encryptedPath, resource: resource };
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

	static pathToId(path) {
		return filename(path);
	}

	static async content(resource) {
		return this.fsDriver().readFile(this.fullPath(resource));
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

}

Resource.IMAGE_MAX_DIMENSION = 1920;

module.exports = Resource;