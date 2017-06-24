import { BaseModel } from 'lib/base-model.js';
import { Setting } from 'lib/models/setting.js';
import { mime } from 'lib/mime-utils.js';

class Resource extends BaseModel {

	static tableName() {
		return 'resources';
	}

	static itemType() {
		return BaseModel.MODEL_TYPE_RESOURCE;
	}

	static fullPath(resource) {
		let extension = mime.toFileExtension(resource.mime);
		extension = extension ? '.' + extension : '';
		return Setting.value('resourceDir') + '/' + resource.id + extension;
	}

}

export { Resource };