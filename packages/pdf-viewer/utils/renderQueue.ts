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
			// Some task is already in progress, so add this task to the queue
			this.tasks.push(task);
		} else {
			this.lock = true;

			const next = () => {
				this.lock = false;
				if (this.tasks.length > 0) {
					// Time to execute the next task in the queue
					const nextTask = this.tasks.shift();
					this.addTask(nextTask);
				}
			};

			// Render the page
			this.executeTaskImpl(task.params).then(task.resolve).catch(task.reject).finally(next);
		}
	};
}
