import AsyncActionQueue from '../AsyncActionQueue';
import { EventEmitter } from 'events';

class UndoQueue {

	private inner_: unknown[] = [];
	private size_ = 20;

	public pop() {
		return this.inner_.pop();
	}

	public push(e: unknown) {
		this.inner_.push(e);
		while (this.length > this.size_) {
			this.inner_.splice(0, 1);
		}
	}

	public get length(): number {
		return this.inner_.length;
	}

	public at(index: number): unknown {
		return this.inner_[index];
	}

}

export default class UndoRedoService {

	private pushAsyncQueue: AsyncActionQueue = new AsyncActionQueue(700);
	private undoStates: UndoQueue = new UndoQueue();
	private redoStates: UndoQueue = new UndoQueue();
	private eventEmitter: EventEmitter = new EventEmitter();
	private isUndoing = false;

	public constructor() {
		this.push = this.push.bind(this);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- EventEmitter events carry heterogeneous payloads by name
	public on(eventName: string, callback: (...args: any[])=> void) {
		return this.eventEmitter.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See on() above
	public off(eventName: string, callback: (...args: any[])=> void) {
		return this.eventEmitter.removeListener(eventName, callback);
	}

	public push(state: unknown) {
		this.undoStates.push(state);
		this.redoStates = new UndoQueue();
		this.eventEmitter.emit('stackChange');
	}

	public schedulePush(state: unknown) {
		this.pushAsyncQueue.push(async () => {
			this.push(state);
		});
	}

	public async undo(redoState: unknown) {
		if (this.isUndoing) return undefined;
		if (!this.canUndo) throw new Error('Nothing to undo');
		this.isUndoing = true;
		await this.pushAsyncQueue.processAllNow();
		const state = this.undoStates.pop();
		this.redoStates.push(redoState);
		this.eventEmitter.emit('stackChange');
		this.isUndoing = false;
		return state;
	}

	public async redo(undoState: unknown) {
		if (this.isUndoing) return undefined;
		if (!this.canRedo) throw new Error('Nothing to redo');
		this.isUndoing = true;
		await this.pushAsyncQueue.processAllNow();
		const state = this.redoStates.pop();
		this.undoStates.push(undoState);
		this.eventEmitter.emit('stackChange');
		this.isUndoing = false;
		return state;
	}

	public async reset() {
		this.undoStates = new UndoQueue();
		this.redoStates = new UndoQueue();
		this.isUndoing = false;
		const output = this.pushAsyncQueue.reset();
		this.eventEmitter.emit('stackChange');
		return output;
	}

	public get canUndo(): boolean {
		return !!this.undoStates.length;
	}

	public get canRedo(): boolean {
		return !!this.redoStates.length;
	}

}
