import AsyncActionQueue from '../AsyncActionQueue';
const EventEmitter = require('events');

class UndoQueue {

	private inner_:any[] = [];
	private size_:number = 20;

	pop() {
		return this.inner_.pop();
	}

	push(e:any) {
		this.inner_.push(e);
		while (this.length > this.size_) {
			this.inner_.splice(0,1);
		}
	}

	get length():number {
		return this.inner_.length;
	}

	at(index:number):any {
		return this.inner_[index];
	}

}

export default class UndoRedoService {

	private pushAsyncQueue:AsyncActionQueue = new AsyncActionQueue(700);
	private undoStates:UndoQueue = new UndoQueue();
	private redoStates:UndoQueue = new UndoQueue();
	private eventEmitter:any = new EventEmitter();
	private isUndoing:boolean = false;

	constructor() {
		this.push = this.push.bind(this);
	}

	on(eventName:string, callback:Function) {
		return this.eventEmitter.on(eventName, callback);
	}

	off(eventName:string, callback:Function) {
		return this.eventEmitter.removeListener(eventName, callback);
	}

	push(state:any) {
		this.undoStates.push(state);
		this.redoStates = new UndoQueue();
		this.eventEmitter.emit('stackChange');
	}

	schedulePush(state:any) {
		this.pushAsyncQueue.push(async () => {
			this.push(state);
		});
	}

	async undo(redoState:any) {
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

	async redo(undoState:any) {
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

	async reset() {
		this.undoStates = new UndoQueue();
		this.redoStates = new UndoQueue();
		this.isUndoing = false;
		const output = this.pushAsyncQueue.reset();
		this.eventEmitter.emit('stackChange');
		return output;
	}

	get canUndo():boolean {
		return !!this.undoStates.length;
	}

	get canRedo():boolean {
		return !!this.redoStates.length;
	}

}
