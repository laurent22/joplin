import config from '../config';
import { Models } from '../models/factory';
import { afterAllTests, beforeAllDb, beforeEachDb, expectThrow, models, msleep } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import TaskService, { RunType, Task } from './TaskService';

const newService = () => {
	return new TaskService(Env.Dev, models(), config());
};

describe('TaskService', function() {

	beforeAll(async () => {
		await beforeAllDb('TaskService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should register a task', async function() {
		const service = newService();

		const task: Task = {
			id: 'test',
			description: '',
			run: (_models: Models) => {},
			schedule: '',
		};

		service.registerTask(task);

		expect(service.tasks['test']).toBeTruthy();
		await expectThrow(async () => service.registerTask(task));
	});

	test('should run a task', async function() {
		const service = newService();

		let finishTask = false;
		let taskHasRan = false;

		const task: Task = {
			id: 'test',
			description: '',
			run: async (_models: Models) => {
				const iid = setInterval(() => {
					if (finishTask) {
						clearInterval(iid);
						taskHasRan = true;
					}
				}, 1);
			},
			schedule: '',
		};

		service.registerTask(task);

		expect(service.taskState('test').running).toBe(false);

		const startTime = new Date();

		void service.runTask('test', RunType.Manual);
		expect(service.taskState('test').running).toBe(true);
		expect(service.taskState('test').lastCompletionTime).toBeFalsy();
		expect(service.taskState('test').lastRunTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());

		finishTask = true;
		await msleep(10);

		expect(taskHasRan).toBe(true);
		expect(service.taskState('test').running).toBe(false);
		expect(service.taskState('test').lastCompletionTime.getTime()).toBeGreaterThan(startTime.getTime());

	});

});
