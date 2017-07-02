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

	static itemType() {
		return BaseModel.MODEL_TYPE_RESOURCE;
	}

	static serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'sync_time');
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
		// TODO: node-only, and should probably be done with streams
		const fs = require('fs-extra');
		return fs.readFile(this.fullPath(resource));
	}

	static setContent(resource, content) {
		// TODO: node-only, and should probably be done with streams
		const fs = require('fs-extra');
		let buffer = new Buffer(content);
		return fs.writeFile(this.fullPath(resource), buffer);
	}

}

export { Resource };