const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');

class MasterKey extends BaseItem {

	static tableName() {
		return 'master_keys';
	}

	static modelType() {
		return BaseModel.TYPE_MASTER_KEY;
	}

	static encryptionSupported() {
		return false;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		return super.serialize(item, 'master_key', fieldNames);
	}

}

module.exports = MasterKey;