const { BaseModel } = require('lib/base-model.js');
const { BaseItem } = require('lib/models/base-item.js');

class MasterKey extends BaseItem {

	static tableName() {
		return 'master_keys';
	}

	static modelType() {
		return BaseModel.TYPE_MASTER_KEY;
	}

}

module.exports = MasterKey;