import config from '../config';
import { TaskId } from '../services/database/types';
import { Services } from '../services/types';
import setupTaskService from './setupTaskService';
import { afterAllTests, beforeAllDb, beforeEachDb, db, getDatabaseClientType, models, msleep } from './testing/testUtils';
import { DatabaseConfigClient, Env } from './types';

const newServices = (): Services => {
	return {
		email: null,
		mustache: null,
		tasks: null,
		userDeletion: null,
	};
};

const isSqlite = () => getDatabaseClientType() === DatabaseConfigClient.SQLite;

describe('setupTaskService', () => {

	beforeAll(async () => {
		await beforeAllDb('setupTaskService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should not open a separate connection pool when using SQLite', async () => {
		const taskService = await setupTaskService(Env.Prod, models(), config(), newServices());

		try {
			if (isSqlite()) {
				expect(taskService.taskStateDb).toBeNull();
			} else {
				expect(taskService.taskStateDb).toBeTruthy();
			}
		} finally {
			await taskService.destroy();
		}
	});

	test('should serialise task state writes with the main connection when using SQLite', async () => {
		if (!isSqlite()) return;

		const taskService = await setupTaskService(Env.Prod, models(), config(), newServices());

		// An open transaction holds the only connection of the SQLite pool. The
		// task state write must queue behind it - if it goes through on its own
		// connection, the two writers race for the file lock and eventually
		// leave one of them stuck inside a transaction.
		const trx = await db().transaction();

		let completed = false;
		let writeError: Error = null;
		const writePromise = (async () => {
			try {
				await taskService.enableTask(TaskId.ProcessShares, false);
			} catch (error) {
				writeError = error;
			}
			completed = true;
		})();

		try {
			await msleep(500);
			expect(completed).toBe(false);
		} finally {
			await trx.commit();
			await writePromise;
			await taskService.destroy();
		}

		expect(writeError).toBeNull();
	});

});
