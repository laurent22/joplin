it('should pass', async function() {
	expect(true).toBe(true);
});

// import { afterAllTests, beforeAllDb, beforeEachDb, db } from "./utils/testing/testUtils";
// import sqlts from '@rmp135/sql-ts';
// import config from "./config";
// import { connectDb, DbConnection, disconnectDb, migrateDown, migrateList, migrateUp, nextMigration } from "./services/database/types";

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
