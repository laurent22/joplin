import { afterAllTests, beforeAllDb, beforeEachDb, db, expectThrow, packageRootDir } from './utils/testing/testUtils';
import { connectDb, disconnectDb, reconnectDb, sqliteSyncSlave } from './db';
import { Event } from './services/database/types';
import { DatabaseConfig, DatabaseConfigClient } from './utils/types';
import { createDb } from './tools/dbTools';

const event1: Event = {
	id: 'test1',
	type: 1,
	name: 'test',
	created_time: Date.now(),
};

const event2 = {
	...event1,
	id: 'test2',
};

describe('db', () => {

	beforeEach(async () => {
		await beforeAllDb('db');
		await beforeEachDb();
	});

	afterEach(async () => {
		await afterAllTests();
	});

	it('should reconnect a database', async () => {
		await disconnectDb(db());
		await expectThrow(async () => db().insert(event1).into('events'));

		await reconnectDb(db());
		await db().insert(event1).into('events');

		{
			const results = await db().select('*').from('events');
			expect(results.length).toBe(1);
			expect(results[0].id).toBe('test1');
		}

		await reconnectDb(db());
		await db().insert(event2).into('events');

		{
			const results = await db().select('*').from('events');
			expect(results.length).toBe(2);
			expect([results[0].id, results[1].id].sort()).toEqual(['test1', 'test2']);
		}
	});

	it('should manually sync an SQLite slave instance', async () => {
		const masterConfig: DatabaseConfig = {
			client: DatabaseConfigClient.SQLite,
			name: `${packageRootDir}/db-master-test.sqlite`,
		};

		const slaveConfig: DatabaseConfig = {
			client: DatabaseConfigClient.SQLite,
			name: `${packageRootDir}/db-slave-test.sqlite`,
		};

		await createDb(masterConfig, { dropIfExists: true });
		await createDb(slaveConfig, { dropIfExists: true });

		const master = await connectDb(masterConfig);
		const slave = await connectDb(slaveConfig);

		await master.insert(event1).into('events');

		expect((await master.select('*').from('events')).length).toBe(1);
		expect((await slave.select('*').from('events')).length).toBe(0);

		await sqliteSyncSlave(master, slave);

		expect((await master.select('*').from('events')).length).toBe(1);
		expect((await slave.select('*').from('events')).length).toBe(1);

		await disconnectDb(master);
		await disconnectDb(slave);
	});

});
