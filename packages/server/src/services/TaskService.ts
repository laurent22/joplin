import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import BaseService from './BaseService';
import { Event, EventType } from './database/types';
const cron = require('node-cron');

const logger = Logger.create('TaskService');

export enum TaskId {
	DeleteExpiredTokens = 1,
	UpdateTotalSizes = 2,
	HandleOversizedAccounts = 3,
	HandleBetaUserEmails = 4,
	HandleFailedPaymentSubscriptions = 5,
	DeleteExpiredSessions = 6,
}

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

export type Tasks = Record<number, Task>;

interface TaskState {
	running: boolean;
}

const defaultTaskState: TaskState = {
	running: false,
};

interface TaskEvents {
	taskStarted: Event;
	taskCompleted: Event;
}

export default class TaskService extends BaseService {

	private tasks_: Tasks = {};
	private taskStates_: Record<number, TaskState> = {};

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

	public async taskLastEvents(id: TaskId): Promise<TaskEvents> {
		return {
			taskStarted: await this.models.event().lastEventByTypeAndName(EventType.TaskStarted, id.toString()),
			taskCompleted: await this.models.event().lastEventByTypeAndName(EventType.TaskCompleted, id.toString()),
		};
	}

	private taskById(id: TaskId): Task {
		if (!this.tasks_[id]) throw new Error(`No such task: ${id}`);
		return this.tasks_[id];
	}

	private taskDisplayString(id: TaskId): string {
		const task = this.taskById(id);
		return `#${task.id} (${task.description})`;
	}

	public async runTask(id: TaskId, runType: RunType) {
		const displayString = this.taskDisplayString(id);
		const state = this.taskState(id);
		if (state.running) throw new Error(`Already running: ${displayString}`);

		const startTime = Date.now();

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: true,
		};

		await this.models.event().create(EventType.TaskStarted, id.toString());

		try {
			logger.info(`Running ${displayString} (${runTypeToString(runType)})...`);
			await this.tasks_[id].run(this.models);
		} catch (error) {
			logger.error(`On ${displayString}`, error);
		}

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: false,
		};

		await this.models.event().create(EventType.TaskCompleted, id.toString());

		logger.info(`Completed ${this.taskDisplayString(id)} in ${Date.now() - startTime}ms`);
	}

	public async runInBackground() {
		for (const [taskId, task] of Object.entries(this.tasks_)) {
			if (!task.schedule) continue;

			logger.info(`Scheduling ${this.taskDisplayString(task.id)}: ${task.schedule}`);

			cron.schedule(task.schedule, async () => {
				await this.runTask(Number(taskId), RunType.Scheduled);
			});
		}
	}

}
