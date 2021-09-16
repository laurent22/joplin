import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import BaseService from './BaseService';

const logger = Logger.create('tasks');

type TaskId = string;

export interface Task {
	id: TaskId;
	description: string;
	run(models: Models): Promise<void>;
}

interface TaskState {
	running: boolean;
}

const defaultTaskState: TaskState = {
	running: false,
};

export default class TaskService extends BaseService {

	private tasks_: Record<TaskId, Task> = {};
	private taskStates_: Record<TaskId, TaskState> = {};

	public registerTask(task: Task) {
		if (this.tasks_[task.id]) throw new Error(`Already a task with this ID: ${task.id}`);
		this.tasks_[task.id] = task;
		this.taskStates_[task.id] = { ...defaultTaskState };
	}

	public registerTasks(tasks: Task[]) {
		for (const task of tasks) this.registerTask(task);
	}

	private taskState(id: TaskId): TaskState {
		if (!this.taskStates_[id]) throw new Error(`No such task: ${id}`);
		return this.taskStates_[id];
	}

	public async runTask(id: TaskId) {
		const state = this.taskState(id);
		if (state.running) throw new Error(`Task is already running: ${id}`);

		const startTime = Date.now();

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: true,
		};

		try {
			logger.info(`Running "${id}"...`);
			await this.tasks_[id].run(this.models);
		} catch (error) {
			logger.error(`On task "${id}"`, error);
		}

		this.taskStates_[id] = {
			...this.taskStates_[id],
			running: false,
		};

		logger.info(`Completed "${id}" in ${Date.now() - startTime}ms`);
	}

}
