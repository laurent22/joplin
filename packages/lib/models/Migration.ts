import BaseModel from '../BaseModel';
import JoplinDatabase from '../JoplinDatabase';
import migration40 from '../migrations/40';
import { MigrationEntity } from '../services/database/types';

export interface MigrationScript {
	exec(db: JoplinDatabase): Promise<void>;
}

const migrationScripts: Record<number, MigrationScript> = {
	20: require('../migrations/20.js'),
	27: require('../migrations/27.js'),
	33: require('../migrations/33.js'),
	35: require('../migrations/35.js'),
	40: migration40,
};

export default class Migration extends BaseModel {
	static tableName() {
		return 'migrations';
	}

	static modelType() {
		return BaseModel.TYPE_MIGRATION;
	}

	public static migrationsToDo(): Promise<MigrationEntity[]> {
		return this.modelSelectAll('SELECT * FROM migrations ORDER BY number ASC');
	}

	static script(number: number) {
		if (!migrationScripts[number]) throw new Error('Migration script has not been added to "migrationScripts" array');
		return migrationScripts[number];
	}
}
