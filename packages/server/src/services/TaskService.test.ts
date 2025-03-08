import config from '../config';
import { Models } from '../models/factory';
import { ErrorCode } from '../utils/errors';
import { afterAllTests, beforeAllDb, beforeEachDb, expectThrow, models } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import { TaskId } from './database/types';
import TaskService, { RunType, Task } from './TaskService';

const newService = () => {
	return new TaskService(Env.Dev, models(), config(), {
		email: null,
		mustache: null,
		tasks: null,
		userDeletion: null,
	});
};

const createDemoTasks = (): Task[] => {
	return [
		{
			id: TaskId.DeleteExpiredTokens,
			description: '',
			run: (_models: Models) => {},
			schedule: '',
		},
		{
			id: TaskId.CompressOldChanges,
			description: '',
			run: (_models: Models) => {},
			schedule: '',
		},
	];
};

describe('TaskService', () => {

	beforeAll(async () => {
		await beforeAllDb('TaskService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should register a task', async () => {
		const service = newService();

		const tasks = createDemoTasks();
		await service.registerTasks(tasks);

		expect(service.tasks[TaskId.DeleteExpiredTokens]).toBeTruthy();
		expect(service.tasks[TaskId.CompressOldChanges]).toBeTruthy();
		await expectThrow(async () => service.registerTask(tasks[0]));
	});

	test('should not run if task is disabled', async () => {
		const service = newService();

		let taskHasRan = false;

		const tasks = createDemoTasks();
		tasks[0].run = async (_models: Models) => {
			taskHasRan = true;
		};
		await service.registerTasks(tasks);
		const taskId = tasks[0].id;

		await service.runTask(taskId, RunType.Manual);
		expect(taskHasRan).toBe(true);

		taskHasRan = false;
		await models().taskState().disable(taskId);
		await service.runTask(taskId, RunType.Manual);
		expect(taskHasRan).toBe(false);
	});

	test('should not run if task is already running', async () => {
		const service = newService();

		const tasks = createDemoTasks();
		await service.registerTasks(tasks);
		const task = tasks[0];

		const state = await models().taskState().loadByTaskId(task.id);
		await models().taskState().save({ id: state.id, running: 1 });

		await expectThrow(async () => service.runTask(task.id, RunType.Manual), ErrorCode.TaskAlreadyRunning);
	});

	test('should reset interrupted tasks', async () => {
		const service = newService();

		const tasks = createDemoTasks();
		await service.registerTasks(tasks);
		const task = tasks[0];

		const state = await models().taskState().loadByTaskId(task.id);
		await models().taskState().save({ id: state.id, running: 1 });

		const stateBefore = await models().taskState().loadByTaskId(task.id);

		await service.resetInterruptedTasks();

		const stateAfter = await models().taskState().loadByTaskId(task.id);

		expect(stateBefore.running).toBe(1);
		expect(stateAfter.running).toBe(0);
	});

});
