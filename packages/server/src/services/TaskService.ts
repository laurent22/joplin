import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import BaseService from './BaseService';
const cron = require('node-cron');

const logger = Logger.create('TaskService');

type TaskId = string;

export enum RunType {
	Scheduled = 1,
	Manual = 2,
}

const runTypeToString = (runType: RunType) => {
	if (runType === RunType.Scheduled) return 'scheduled';
	if (runType === RunType.Manual) return 'manual';
	throw new Error(`Unknown run type: ${runType}`);
};

export interface Task {
	id: TaskId;
	description: string;
	schedule: string;
	run(models: Models): void;
}

export type Tasks = Record<TaskId, Task>;

interface TaskState {
	running: boolean;
	lastRunTime: Date;
	lastCompletionTime: Date;
}

const defaultTaskState: TaskState = {
	running: false,
	lastRunTime: null,
	lastCompletionTime: null,
};

export default class TaskService extends BaseService {

	private tasks_: Tasks = {};
	private taskStates_: Record<TaskId, TaskState> = {};

	public registerTask(task: Task) {
		if (this.tasks_[task.id]) throw new Error(`Already a task with this ID: ${task.id}`);
		this.tasks_[task.id] = task;
		this.taskStates_[task.id] = { ...defaultTaskState };
	}

	public registerTasks(tasks: Task[]) {
		for (const task of tasks) this.registerTask(task);
	}

	public get tasks(): Tasks {
		return this.tasks_;
	}

	public taskState(id: TaskId): TaskState {
		if (!this.taskStates_[id]) throw new Error(`No such task: ${id}`);
		return this.taskStates_[id];
	}

	// TODO: add tests

	public async runTask(id: TaskId, runType: RunType) {
		const state = this.taskState(id);
		if (state.running) throw new Error(`Task is already running: ${id}`);

		const startTime = Date.now();

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: true,
			lastRunTime: new Date(),
		};

		try {
			logger.info(`Running "${id}" (${runTypeToString(runType)})...`);
			await this.tasks_[id].run(this.models);
		} catch (error) {
			logger.error(`On task "${id}"`, error);
		}

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: false,
			lastCompletionTime: new Date(),
		};

		logger.info(`Completed "${id}" in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		for (const [taskId, task] of Object.entries(this.tasks_)) {
			if (!task.schedule) continue;

			logger.info(`Scheduling task "${taskId}": ${task.schedule}`);

			cron.schedule(task.schedule, async () => {
				await this.runTask(taskId, RunType.Scheduled);
			});
		}
	}

}
