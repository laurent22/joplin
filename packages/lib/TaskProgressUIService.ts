type Listener = (task: Task)=> void;

interface Task {
	id: string;
	message: string;
	progress: number;
	data: object;
	started: boolean;
}

class TaskProgressUIService {

	// Tasks that are being tracked.
	private tasks = new Map<string, Task>();

	// Tasks that were not yet updated (waiting to be sent to the listener).
	private queue = new Set<string>();

	private listener: Listener;

	public setListener(listener: Listener): void {
		this.listener = listener;

		if (listener) {
			this.dequeue();
		}
	}

	private dequeue(): void {
		for (const id of this.queue) {
			const task = this.tasks.get(id);

			this.listener(task);

			if (task.progress >= 100) {
				this.tasks.delete(id);
			}
		}

		this.queue.clear();
	}

	public onTaskStarted(id: string, message: string): void {
		const task: Task = {
			id,
			message,
			progress: 0,
			data: undefined,
			started: false,
		};

		if (this.listener) {
			this.listener(task);
		} else {
			this.queue.add(id);
		}

		this.tasks.set(id, task);
	}

	public onTaskProgress(id: string, progress: number): void {
		const task = this.tasks.get(id);

		task.progress = progress % 100;

		if (this.listener) {
			this.listener(task);
		} else {
			this.queue.add(id);
		}
	}

	public onTaskCompleted(id: string, message: string): void {
		const task = this.tasks.get(id);

		task.message = message;
		task.progress = 100;

		if (this.listener) {
			this.listener(task);
			this.tasks.delete(id);
		} else {
			this.queue.add(id);
		}
	}
}

export default new TaskProgressUIService();
