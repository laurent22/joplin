import Logger from '@joplin/utils/Logger';
import newModelFactory, { Models } from '../models/factory';
import { DbConnection, disconnectDb } from '../db';
import { Config, Env } from '../utils/types';
import BaseService from './BaseService';
import { Event, EventType, TaskId, TaskState } from './database/types';
import { Services } from './types';
import { _ } from '@joplin/lib/locale';
import { ErrorCode, ErrorNotFound } from '../utils/errors';
import { durationToMilliseconds } from '../utils/time';

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
		[TaskId.ProcessShares]: 'Process shared items',
		[TaskId.ProcessEmails]: 'Process emails',
		[TaskId.LogHeartbeatMessage]: 'Log heartbeat message',
		[TaskId.DeleteOldEvents]: 'Delete old events',
		[TaskId.DeleteExpiredAuthCodes]: 'Delete expired authentication codes',
		[TaskId.DeleteArchivedBackups]: 'Delete archived account backups',
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
	private taskStateModels_: Models;
	private taskStateDb_: DbConnection;
	private scheduledHandles_: (ReturnType<typeof setInterval> | { stop: ()=> void })[] = [];
	private taskServiceDestroyed_ = false;

	public constructor(env: Env, models: Models, config: Config, services: Services, taskStateDb: DbConnection = null) {
		super(env, models, config);
		this.services_ = services;
		this.taskStateDb_ = taskStateDb;
		this.taskStateModels_ = taskStateDb ? newModelFactory(taskStateDb, taskStateDb, config) : models;
	}

	public async destroy() {
		this.taskServiceDestroyed_ = true;
		for (const handle of this.scheduledHandles_) {
			if (typeof handle === 'object' && 'stop' in handle) {
				handle.stop();
			} else {
				clearInterval(handle);
			}
		}
		this.scheduledHandles_ = [];
		await super.destroy();
		if (this.taskStateDb_) {
			await disconnectDb(this.taskStateDb_);
			this.taskStateDb_ = null;
			this.taskStateModels_ = null;
		}
	}

	public async registerTask(task: Task) {
		if (this.tasks_[task.id]) throw new Error(`Already a task with this ID: ${task.id}`);
		this.tasks_[task.id] = task;
		await this.taskStateModels_.taskState().init(task.id);
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
		if (this.taskServiceDestroyed_) return [];
		return this.taskStateModels_.taskState().loadByTaskIds(ids);
	}

	public async taskState(id: TaskId): Promise<TaskState> {
		const r = await this.taskStates([id]);
		if (!r.length) throw new ErrorNotFound(`No such task: ${id}`);
		return r[0];
	}

	public async taskLastEvents(id: TaskId): Promise<TaskEvents> {
		if (this.taskServiceDestroyed_) return { taskStarted: null, taskCompleted: null };
		return {
			taskStarted: await this.taskStateModels_.event().lastEventByTypeAndName(EventType.TaskStarted, id.toString()),
			taskCompleted: await this.taskStateModels_.event().lastEventByTypeAndName(EventType.TaskCompleted, id.toString()),
		};
	}

	public async resetInterruptedTasks() {
		if (this.taskServiceDestroyed_) return;
		const taskStates = await this.taskStateModels_.taskState().all();
		for (const taskState of taskStates) {
			if (taskState.running) {
				logger.warn(`Found a task that was in running state: ${this.taskDisplayString(taskState.task_id)} - resetting it.`);
				await this.taskStateModels_.taskState().stop(taskState.task_id);
			}
		}
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
		if (this.taskServiceDestroyed_) return;
		const displayString = this.taskDisplayString(id);
		const taskState = await this.taskStateModels_.taskState().loadByTaskId(id);
		if (!taskState) throw new Error(`Invalid task: ${id}: ${runType}`);

		if (!taskState.enabled) {
			logger.info(`Not running ${displayString} because the tasks is disabled`);
			return;
		}

		await this.taskStateModels_.taskState().start(id);

		const startTime = Date.now();

		await this.taskStateModels_.event().create(EventType.TaskStarted, id.toString());

		try {
			logger.info(`Running ${displayString} (${runTypeToString(runType)})...`);
			await this.tasks_[id].run(this.models, this.services_);
		} catch (error) {
			logger.error(`On ${displayString}`, error);
		}

		await this.taskStateModels_.taskState().stop(id);
		await this.taskStateModels_.event().create(EventType.TaskCompleted, id.toString());

		logger.info(`Completed ${this.taskDisplayString(id)} in ${Date.now() - startTime}ms`);
	}

	public async enableTask(taskId: TaskId, enabled = true) {
		if (this.taskServiceDestroyed_) return;
		await this.taskStateModels_.taskState().enable(taskId, enabled);
	}

	public async runInBackground() {
		for (const [taskId, task] of Object.entries(this.tasks_)) {
			if (!task.schedule) continue;

			logger.info(`Scheduling ${this.taskDisplayString(task.id)}: ${task.schedule}`);

			let interval: number|null = null;
			try {
				interval = durationToMilliseconds(task.schedule);
			} catch (error) {
				// Assume that we have a cron schedule
				interval = null;
			}

			const runTaskWithErrorChecking = async (taskId: TaskId) => {
				try {
					await this.runTask(taskId, RunType.Scheduled);
				} catch (error) {
					if (error.code === ErrorCode.TaskAlreadyRunning) {
						// This is not critical but we should log a warning
						// because it may mean that the interval is too tight,
						// or the task is taking too long.
						logger.warn(`Tried to start ${this.taskDisplayString(taskId)} but it was already running`);
					} else {
						logger.error(`Failed running task ${this.taskDisplayString(taskId)}`, error);
					}
				}
			};

			if (interval !== null) {
				const handle = setInterval(async () => {
					await runTaskWithErrorChecking(Number(taskId));
				}, interval);
				this.scheduledHandles_.push(handle);
			} else {
				const handle = cron.schedule(task.schedule, async () => {
					await runTaskWithErrorChecking(Number(taskId));
				});
				this.scheduledHandles_.push(handle);
			}
		}
	}

}
