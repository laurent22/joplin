import BaseModel from '../BaseModel';
import migration42 from '../migrations/42';

const migrationScripts: Record<number, any> = {
	20: require('../migrations/20.js'),
	27: require('../migrations/27.js'),
	33: require('../migrations/33.js'),
	35: require('../migrations/35.js'),
	42: migration42,
};

export default class Migration extends BaseModel {
	public static tableName() {
		return 'migrations';
	}

	public static modelType() {
		return BaseModel.TYPE_MIGRATION;
	}

	public static migrationsToDo() {
		return this.modelSelectAll('SELECT * FROM migrations ORDER BY number ASC');
	}

	public static script(number: number) {
		if (!migrationScripts[number]) throw new Error('Migration script has not been added to "migrationScripts" array');
		return migrationScripts[number];
	}
}
