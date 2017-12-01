const { BaseModel } = require('lib/base-model.js');
const { BaseItem } = require('lib/models/base-item.js');
const { Setting } = require('lib/models/setting.js');
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
		return super.serialize(item, 'resource', fieldNames);
	}

	static filename(resource) {
		let extension = resource.file_extension;
		if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
		extension = extension ? '.' + extension : '';
		return resource.id + extension;
	}

	static fullPath(resource) {
		return Setting.value('resourceDir') + '/' + this.filename(resource);
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

module.exports = { Resource };