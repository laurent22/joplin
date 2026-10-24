import config from '../config';
import { Services } from '../services/types';
import setupTaskService from './setupTaskService';
import { afterAllTests, beforeAllDb, beforeEachDb, getDatabaseClientType, models } from './testing/testUtils';
import { DatabaseConfigClient, Env } from './types';
import { TaskId } from '../services/database/types';

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

	test('should use the configured task schedules', async () => {
		const taskService = await setupTaskService(Env.Prod, models(), {
			...config(),
			PROCESS_SHARES_SCHEDULE: 'PT1M',
			PROCESS_EMAILS_SCHEDULE: '0 * * * *',
		}, newServices());

		try {
			expect(taskService.tasks[TaskId.ProcessShares].schedule).toBe('PT1M');
			expect(taskService.tasks[TaskId.ProcessEmails].schedule).toBe('0 * * * *');
		} finally {
			await taskService.destroy();
		}
	});

});
