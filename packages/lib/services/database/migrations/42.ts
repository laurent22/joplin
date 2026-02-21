import addMigrationFile from '../addMigrationFile';
import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		addMigrationFile(42),
	];
};
