import { Minute, Second } from '@joplin/utils/time';
import { DbConnection } from '../../db';
import newModelFactory from '../../models/factory';
import { Config } from '../../utils/types';


export default async function createUserDeletions(db: DbConnection, config: Config) {
	const models = newModelFactory(db, db, config);

	const users = await models.user().all();

	for (let i = 0; i < 3; i++) {
		if (i >= users.length) break;
		if (users[i].is_admin) continue;
		await models.userDeletion().add(users[i].id, Date.now() + 60 * Second + (i * 10 * Minute));
	}
}
