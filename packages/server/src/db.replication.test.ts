import { afterAllTests, beforeAllDb, beforeEachDb, createFolder, createUserAndSession, db, dbSlave, expectThrow, getDatabaseClientType, models, packageRootDir, updateFolder } from './utils/testing/testUtils';
import { connectDb, disconnectDb, reconnectDb, sqliteSyncSlave } from './db';
import { ChangeType, Event } from './services/database/types';
import { DatabaseConfig, DatabaseConfigClient } from './utils/types';
import { createDb } from './tools/dbTools';
import { msleep } from './utils/time';

const eventId1 = '4f405391-bd72-4a4f-809f-344fc6cd4b31';
const eventId2 = '4f405391-bd72-4a4f-809f-344fc6cd4b32';

const event1: Event = {
	id: eventId1,
	type: 1,
	name: 'test',
	created_time: Date.now(),
};

const event2 = {
	...event1,
	id: eventId2,
};

const beforeTest = async (envValues: Record<string, string> = null) => {
	await beforeAllDb('db.replication', envValues ? { envValues } : null);
	await beforeEachDb();
};

const afterTest = async () => {
	await afterAllTests();
};

describe('db.replication', () => {

	it('should reconnect a database', async () => {
		if (getDatabaseClientType() === DatabaseConfigClient.PostgreSQL) return;

		await beforeTest();

		await disconnectDb(db());
		await expectThrow(async () => db().insert(event1).into('events'));

		await reconnectDb(db());
		await db().insert(event1).into('events');

		{
			const results = await db().select('*').from('events');
			expect(results.length).toBe(1);
			expect(results[0].id).toBe(eventId1);
		}

		await reconnectDb(db());
		await db().insert(event2).into('events');

		{
			const results = await db().select('*').from('events');
			expect(results.length).toBe(2);
			expect([results[0].id, results[1].id].sort()).toEqual([eventId1, eventId2]);
		}

		await afterTest();
	});

	it('should manually sync an SQLite slave instance', async () => {
		if (getDatabaseClientType() === DatabaseConfigClient.PostgreSQL) return;

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

	test('should track changes - using replication', async () => {
		if (getDatabaseClientType() === DatabaseConfigClient.PostgreSQL) return;

		await beforeTest({ DB_USE_SLAVE: '1' });

		const { session, user } = await createUserAndSession(1, true);
		const changeModel = models().change();
		changeModel.usersWithReplication_ = [user.id];

		const folder = {
			id: '000000000000000000000000000000F1',
			title: 'title 1',
		};

		const folderItem = await createFolder(session.id, folder);
		await msleep(1);

		let result = await changeModel.delta(user.id);

		// We get nothing because the slave has not been synced yet
		expect(result.items.length).toBe(0);

		// But we still get the item because it doesn't use the slave database
		expect((await models().item().loadAsJoplinItem(folderItem.id)).title).toBe('title 1');

		// After sync, we should get the change
		await sqliteSyncSlave(db(), dbSlave());
		result = await changeModel.delta(user.id);
		expect(result.items.length).toBe(1);
		expect(result.items[0].type).toBe(ChangeType.Create);

		await updateFolder(session.id, { ...folder, title: 'title 2' });
		result = await changeModel.delta(user.id, { cursor: result.cursor });

		// Nothing because it hasn't been synced yet
		expect(result.items.length).toBe(0);

		// But we get the latest item if requesting it directly
		expect((await models().item().loadAsJoplinItem(folderItem.id)).title).toBe('title 2');

		// After sync, we should get the change
		await sqliteSyncSlave(db(), dbSlave());
		result = await changeModel.delta(user.id, { cursor: result.cursor });

		expect(result.items.length).toBe(1);
		expect(result.items[0].type).toBe(ChangeType.Update);

		await afterTest();
	});

});
