import { RenderRequest, RenderResult } from '../types';

interface Task {
	resolve: (result: RenderResult)=> void;
	reject: (error: any)=> void;
	params: RenderRequest;
}

export default class RenderQueue {
	private tasks: Task[];
	private lock = false;
	private executeTaskImpl: (params: RenderRequest)=> Promise<RenderResult>;

	public constructor(executeTaskImpl: (params: RenderRequest)=> Promise<RenderResult>) {
		this.tasks = [];
		this.executeTaskImpl = executeTaskImpl;
	}

	public addTask = (task: Task) => {
		if (this.lock) {
			// console.warn('Adding to task, page:', pageNo, 'prev queue size:', this.renderingQueue.tasks.length);
			this.tasks.push(task);
		} else {
			this.lock = true;
			const next = () => {
				this.lock = false;
				if (this.tasks.length > 0) {
					const nextTask = this.tasks.shift();
					// console.log('executing next task of page:', task.pageNo, 'remaining tasks:', this.renderingQueue.tasks.length);
					this.addTask(nextTask);
				}
			};
			// console.log('rendering page:', pageNo, 'scaledSize:', scaledSize);
			this.executeTaskImpl(task.params).then(task.resolve).catch(task.reject).finally(next);
		}
	};
}
