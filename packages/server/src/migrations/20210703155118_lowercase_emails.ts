import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db('users').update({ email: db.raw('LOWER(email)') });
};

export const down = async (_db: DbConnection) => {

};
