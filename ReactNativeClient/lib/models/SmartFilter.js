const BaseModel = require('lib/BaseModel.js');

class SmartFilter extends BaseModel {
	static tableName() {
		throw new Error('Not using database');
	}

	static modelType() {
		return BaseModel.TYPE_SMART_FILTER;
	}
}

module.exports = SmartFilter;
