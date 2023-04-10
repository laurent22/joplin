import AsyncActionQueue from '../AsyncActionQueue';
const EventEmitter = require('events');

class UndoQueue {

	private inner_: any[] = [];
	private size_: number = 20;

	public pop() {
		return this.inner_.pop();
	}

	public push(e: any) {
		this.inner_.push(e);
		while (this.length > this.size_) {
			this.inner_.splice(0, 1);
		}
	}

	public get length(): number {
		return this.inner_.length;
	}

	public at(index: number): any {
		return this.inner_[index];
	}

}

export default class UndoRedoService {

	private pushAsyncQueue: AsyncActionQueue = new AsyncActionQueue(700);
	private undoStates: UndoQueue = new UndoQueue();
	private redoStates: UndoQueue = new UndoQueue();
	private eventEmitter: any = new EventEmitter();
	private isUndoing: boolean = false;

	public constructor() {
		this.push = this.push.bind(this);
	}

	public on(eventName: string, callback: Function) {
		return this.eventEmitter.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		return this.eventEmitter.removeListener(eventName, callback);
	}

	public push(state: any) {
		this.undoStates.push(state);
		this.redoStates = new UndoQueue();
		this.eventEmitter.emit('stackChange');
	}

	public schedulePush(state: any) {
		this.pushAsyncQueue.push(async () => {
			this.push(state);
		});
	}

	public async undo(redoState: any) {
		if (this.isUndoing) return;
		if (!this.canUndo) throw new Error('Nothing to undo');
		this.isUndoing = true;
		await this.pushAsyncQueue.processAllNow();
		const state = this.undoStates.pop();
		this.redoStates.push(redoState);
		this.eventEmitter.emit('stackChange');
		this.isUndoing = false;
		return state;
	}

	public async redo(undoState: any) {
		if (this.isUndoing) return;
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
