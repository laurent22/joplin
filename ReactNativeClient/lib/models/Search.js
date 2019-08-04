const BaseModel = require('lib/BaseModel.js');

class Search extends BaseModel {
	static tableName() {
		throw new Error('Not using database');
	}

	static modelType() {
		return BaseModel.TYPE_SEARCH;
	}

	static keywords(query) {
		let output = query.trim();
		output = output.split(/[\s\t\n]+/);
		output = output.filter(o => !!o);
		return output;
	}
}

module.exports = Search;
