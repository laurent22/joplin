import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db('users').update({ email: db.raw('LOWER(email)') });
}

export async function down(_db: DbConnection): Promise<any> {

}
