import { BaseModel } from 'lib/base-model.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Setting } from 'lib/models/setting.js';
import { mime } from 'lib/mime-utils.js';
import { filename } from 'lib/path-utils.js';
import lodash  from 'lodash';

class Resource extends BaseItem {

	static tableName() {
		return 'resources';
	}

	static modelType() {
		return BaseModel.TYPE_RESOURCE;
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

	static fullPath(resource) {
		let extension = mime.toFileExtension(resource.mime);
		extension = extension ? '.' + extension : '';
		return Setting.value('resourceDir') + '/' + resource.id + extension;
	}

	static pathToId(path) {
		return filename(path);
	}

	static content(resource) {
		return this.fsDriver().readFile(this.fullPath(resource));
	}

	static setContent(resource, content) {
		return this.fsDriver().writeBinaryFile(this.fullPath(resource), content);
	}

	static isResourceUrl(url) {
		return url.length === 34 && url[0] === ':' && url[1] === '/';
	}

	static urlToId(url) {
		if (!this.isResourceUrl(url)) throw new Error('Not a valid resource URL: ' + url);
		return url.substr(2);
	}

}

export { Resource };