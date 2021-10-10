import { afterAllTests, beforeAllDb, beforeEachDb, createUserAndSession, db, models } from "./utils/testing/testUtils";
import sqlts from '@rmp135/sql-ts';
import config from "./config";
import { connectDb, DbConnection, disconnectDb, migrateDown, migrateList, migrateUp, nextMigration, Uuid } from "./services/database/types";

const { shimInit } = require('@joplin/lib/shim-init-node.js');
const nodeSqlite = require('sqlite3');

shimInit({ nodeSqlite });
process.env.JOPLIN_IS_TESTING = '1';

// async function makeTestItem(userId: Uuid, num: number): Promise<Item> {
// 	return models().item().saveForUser(userId, {
// 		name: `${num.toString().padStart(32, '0')}.md`,
// 	});
// }

const main = async() => {
	await beforeAllDb('db.perf');

	const { user } = await createUserAndSession(1, true);

	await models().item().makeTestItems(user.id, 10000);

	{
		const startTime = Date.now();
		await db().raw('SELECT id FROM items ORDER BY name DESC');
		console.info('Time:', Date.now() - startTime);

		// With collate C:
		//
		// ASC: 23ms
		// DESC: 114


	}

	// const durations:number[] = [];

	// for (let i = 0; i < 1000; i++) {
	// 	const id = 1 + Math.floor(Math.random() * 10000);
	// 	const item = await models().item().loadByName(user.id, `${id.toString().padStart(32, '0')}.md`);
	// 	const startTime = Date.now();
	// 	await models().item().load(item.id);
	// 	durations.push(Date.now() - startTime);
	// }
	

	// let sum = 0;
	// for (const d of durations) sum += d;

	// console.info('Time per query: ' + (sum / durations.length));

	await afterAllTests();
}

main().catch(error => {
	console.error(error);
});

// async function dbSchemaSnapshot(db:DbConnection):Promise<any> {
// 	return sqlts.toObject({
// 		client: 'sqlite',
// 		knex: db,
// 		// 'connection': {
// 		// 	'filename': config().database.name,
// 		// },
// 		useNullAsDefault: true,
// 	} as any)

// 	// return JSON.stringify(definitions);
// }

// describe('db', function() {

// 	beforeAll(async () => {
// 		await beforeAllDb('db', { autoMigrate: false });
// 	});

// 	afterAll(async () => {
// 		await afterAllTests();
// 	});

// 	beforeEach(async () => {
// 		await beforeEachDb();
// 	});

// 	it('should allow downgrading schema', async function() {
// 		const ignoreAllBefore = '20210819165350_user_flags';
// 		let startProcessing = false;

// 		//console.info(await dbSchemaSnapshot());

// 		while (true) {
// 			await migrateUp(db());

// 			if (!startProcessing) {
// 				const next = await nextMigration(db());
// 				if (next === ignoreAllBefore) {
// 					startProcessing = true;
// 				} else {
// 					continue;
// 				}
// 			}

// 			if (!(await nextMigration(db()))) break;

// 			// await disconnectDb(db());
// 			// const beforeSchema = await dbSchemaSnapshot(db());
// 			// console.info(beforeSchema);
// 			// await connectDb(db());

// 			// await migrateUp(db());
// 			// await migrateDown(db());

// 			// const afterSchema = await dbSchemaSnapshot(db());

// 			// // console.info(beforeSchema);
// 			// // console.info(afterSchema);

// 			// expect(beforeSchema).toEqual(afterSchema);
// 		}
// 	});

// });
