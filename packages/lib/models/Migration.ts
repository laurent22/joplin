import BaseModel from '../BaseModel';
import migration20 from '../migrations/20';
import migration27 from '../migrations/27';
import migration33 from '../migrations/33';
import migration35 from '../migrations/35';
import migration42 from '../migrations/42';

interface MigrationScript {
	exec: ()=> Promise<void>;
}

const migrationScripts: Record<number, MigrationScript> = {
	20: migration20,
	27: migration27,
	33: migration33,
	35: migration35,
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
