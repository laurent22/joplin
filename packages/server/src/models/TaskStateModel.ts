import { TaskId, TaskState } from '../services/database/types';
import BaseModel from './BaseModel';

export default class TaskStateModel extends BaseModel<TaskState> {

	public get tableName(): string {
		return 'task_states';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async loadByTaskId(taskId: TaskId): Promise<TaskState> {
		return this.db(this.tableName).where('task_id', '=', taskId).first();
	}

	public async loadByTaskIds(taskIds: TaskId[]): Promise<TaskState[]> {
		return this.db(this.tableName).whereIn('task_id', taskIds);
	}

	public async init(taskId: TaskId) {
		const taskState: TaskState = await this.loadByTaskId(taskId);
		if (taskState) return taskState;

		return this.save({
			task_id: taskId,
			enabled: 1,
			running: 0,
		});
	}

	public async start(taskId: TaskId) {
		const state = await this.loadByTaskId(taskId);
		if (state.running) throw new Error(`Task is already running: ${taskId}`);
		await this.save({ id: state.id, running: 1 });
	}

	public async stop(taskId: TaskId) {
		const state = await this.loadByTaskId(taskId);
		if (!state.running) throw new Error(`Task is not running: ${taskId}`);
		await this.save({ id: state.id, running: 0 });
	}

	public async enable(taskId: TaskId, enabled = true) {
		const state = await this.loadByTaskId(taskId);
		if (state.enabled && enabled) throw new Error(`Task is already enabled: ${taskId}`);
		if (!state.enabled && !enabled) throw new Error(`Task is already disabled: ${taskId}`);
		await this.save({ id: state.id, enabled: enabled ? 1 : 0 });
	}

	public async disable(taskId: TaskId) {
		await this.enable(taskId, false);
	}

}
