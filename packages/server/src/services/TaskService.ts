import Logger from '@joplin/lib/Logger';
import { Models } from '../models/factory';
import { Config, Env } from '../utils/types';
import BaseService from './BaseService';
import { Event, EventType, TaskId, TaskState } from './database/types';
import { Services } from './types';
import { _ } from '@joplin/lib/locale';
import { ErrorNotFound } from '../utils/errors';
const cron = require('node-cron');

const logger = Logger.create('TaskService');

export enum RunType {
	Scheduled = 1,
	Manual = 2,
}

export const taskIdToLabel = (taskId: TaskId): string => {
	const strings: Record<TaskId, string> = {
		[TaskId.DeleteExpiredTokens]: _('Delete expired tokens'),
		[TaskId.UpdateTotalSizes]: _('Update total sizes'),
		[TaskId.HandleOversizedAccounts]: _('Process oversized accounts'),
		[TaskId.HandleBetaUserEmails]: 'Process beta user emails',
		[TaskId.HandleFailedPaymentSubscriptions]: _('Process failed payment subscriptions'),
		[TaskId.DeleteExpiredSessions]: _('Delete expired sessions'),
		[TaskId.CompressOldChanges]: _('Compress old changes'),
		[TaskId.ProcessUserDeletions]: _('Process user deletions'),
		[TaskId.AutoAddDisabledAccountsForDeletion]: _('Auto-add disabled accounts for deletion'),
		[TaskId.ProcessOrphanedItems]: 'Process orphaned items',
	};

	const s = strings[taskId];
	if (!s) throw new Error(`No such task: ${taskId}`);

	return s;
};

const runTypeToString = (runType: RunType) => {
	if (runType === RunType.Scheduled) return 'scheduled';
	if (runType === RunType.Manual) return 'manual';
	throw new Error(`Unknown run type: ${runType}`);
};

export interface Task {
	id: TaskId;
	description: string;
	schedule: string;
	run(models: Models, services: Services): void;
}

export type Tasks = Record<number, Task>;

interface TaskEvents {
	taskStarted: Event;
	taskCompleted: Event;
}

export default class TaskService extends BaseService {

	private tasks_: Tasks = {};
	private services_: Services;

	public constructor(env: Env, models: Models, config: Config, services: Services) {
		super(env, models, config);
		this.services_ = services;
	}

	public async registerTask(task: Task) {
		if (this.tasks_[task.id]) throw new Error(`Already a task with this ID: ${task.id}`);
		this.tasks_[task.id] = task;
		await this.models.taskState().init(task.id);
	}

	public async registerTasks(tasks: Task[]) {
		for (const task of tasks) await this.registerTask(task);
	}

	public get tasks(): Tasks {
		return this.tasks_;
	}

	public get taskIds(): TaskId[] {
		return Object.keys(this.tasks_).map(s => Number(s));
	}

	public async taskStates(ids: TaskId[]): Promise<TaskState[]> {
		return this.models.taskState().loadByTaskIds(ids);
	}

	public async taskState(id: TaskId): Promise<TaskState> {
		const r = await this.taskStates([id]);
		if (!r.length) throw new ErrorNotFound(`No such task: ${id}`);
		return r[0];
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
		const taskState = await this.models.taskState().loadByTaskId(id);
		if (!taskState.enabled) {
			logger.info(`Not running ${displayString} because the tasks is disabled`);
			return;
		}

		await this.models.taskState().start(id);

		const startTime = Date.now();

		await this.models.event().create(EventType.TaskStarted, id.toString());

		try {
			logger.info(`Running ${displayString} (${runTypeToString(runType)})...`);
			await this.tasks_[id].run(this.models, this.services_);
		} catch (error) {
			logger.error(`On ${displayString}`, error);
		}

		await this.models.taskState().stop(id);
		await this.models.event().create(EventType.TaskCompleted, id.toString());

		logger.info(`Completed ${this.taskDisplayString(id)} in ${Date.now() - startTime}ms`);
	}

	public async enableTask(taskId: TaskId, enabled = true) {
		await this.models.taskState().enable(taskId, enabled);
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
