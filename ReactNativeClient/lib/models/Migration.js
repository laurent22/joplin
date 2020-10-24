const BaseModel = require('lib/BaseModel.js');

const migrationScripts = {
	20: require('lib/migrations/20.js'),
	27: require('lib/migrations/27.js'),
	33: require('lib/migrations/33.js'),
};

class Migration extends BaseModel {
	static tableName() {
		return 'migrations';
	}

	static modelType() {
		return BaseModel.TYPE_MIGRATION;
	}

	static migrationsToDo() {
		return this.modelSelectAll('SELECT * FROM migrations ORDER BY number ASC');
	}

	static script(number) {
		if (!migrationScripts[number]) throw new Error('Migration script has not been added to "migrationScripts" array');
		return migrationScripts[number];
	}
}

module.exports = Migration;
