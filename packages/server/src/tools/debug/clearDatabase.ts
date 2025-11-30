import { DbConnection, dropTables, migrateLatest } from '../../db';

export default async function clearDatabase(db: DbConnection) {
	await dropTables(db);
	await migrateLatest(db);
}
