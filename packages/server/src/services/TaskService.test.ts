import config from '../config';
import { Models } from '../models/factory';
import { afterAllTests, beforeAllDb, beforeEachDb, expectThrow, models } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import { TaskId } from './database/types';
import TaskService, { RunType, Task } from './TaskService';

const newService = () => {
	return new TaskService(Env.Dev, models(), config(), {
		share: null,
		email: null,
		mustache: null,
		tasks: null,
		userDeletion: null,
	});
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

		const task: Task = {
			id: TaskId.DeleteExpiredTokens,
			description: '',
			run: (_models: Models) => {},
			schedule: '',
		};

		await service.registerTask(task);

		expect(service.tasks[TaskId.DeleteExpiredTokens]).toBeTruthy();
		await expectThrow(async () => service.registerTask(task));
	});

	// test('should run a task', async function() {
	// 	const service = newService();

	// 	let taskStarted = false;
	// 	let waitToFinish = true;
	// 	let finishTask = false;
	// 	let taskHasRan = false;

	// 	const taskId = TaskId.DeleteExpiredTokens;

	// 	const task: Task = {
	// 		id: taskId,
	// 		description: '',
	// 		run: async (_models: Models) => {
	// 			taskStarted = true;

	// 			const iid = setInterval(() => {
	// 				if (waitToFinish) return;

	// 				if (finishTask) {
	// 					clearInterval(iid);
	// 					taskHasRan = true;
	// 				}
	// 			}, 1);
	// 		},
	// 		schedule: '',
	// 	};

	// 	await service.registerTask(task);

	// 	expect((await service.taskState(taskId)).running).toBe(0);

	// 	const startTime = new Date();

	// 	void service.runTask(taskId, RunType.Manual);
	// 	while (!taskStarted) {
	// 		await msleep(1);
	// 	}

	// 	expect((await service.taskState(taskId)).running).toBe(1);
	// 	waitToFinish = false;

	// 	while (!taskHasRan) {
	// 		await msleep(1);
	// 		finishTask = true;
	// 	}

	// 	expect((await service.taskState(taskId)).running).toBe(0);

	// 	const events = await service.taskLastEvents(taskId);
	// 	expect(events.taskStarted.created_time).toBeGreaterThanOrEqual(startTime.getTime());
	// 	expect(events.taskCompleted.created_time).toBeGreaterThan(startTime.getTime());
	// });

	test('should not run if task is disabled', async () => {
		const service = newService();

		let taskHasRan = false;

		const taskId = TaskId.DeleteExpiredTokens;

		const task: Task = {
			id: taskId,
			description: '',
			run: async (_models: Models) => {
				taskHasRan = true;
			},
			schedule: '',
		};

		await service.registerTask(task);

		await service.runTask(taskId, RunType.Manual);
		expect(taskHasRan).toBe(true);

		taskHasRan = false;
		await models().taskState().disable(task.id);
		await service.runTask(taskId, RunType.Manual);
		expect(taskHasRan).toBe(false);
	});

});
