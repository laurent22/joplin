
import _20_236 from '../migrations/20.js';
import _27_237 from '../migrations/27.js';
import _33_238 from '../migrations/33.js';
import _35_239 from '../migrations/35.js';
import BaseModel from '../BaseModel';
import migration42 from '../migrations/42';
interface MigrationScript {
	exec: ()=> Promise<void>;
}

const migrationScripts: Record<number, MigrationScript> = {
	20: _20_236,
	27: _27_237,
	33: _33_238,
	35: _35_239,
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
