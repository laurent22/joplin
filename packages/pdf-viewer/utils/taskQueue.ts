// Adopted from:
// https://stackoverflow.com/questions/1590247/how-do-you-implement-a-stack-and-a-queue-in-javascript?page=2&tab=scoredesc#tab-top

export default class TaskQueue<T> {
	private s1: T[];
	private s2: T[];

	public constructor() {
		this.s1 = []; // in
		this.s2 = []; // out
	}

	public enqueue(val: T) {
		this.s1.push(val);
	}

	public dequeue() {
		if (this.s2.length === 0) {
			this._move();
		}
		return this.s2.pop(); // return undefined if empty
	}

	public get length() {
		return this.s1.length + this.s2.length;
	}

	private _move() {
		while (this.s1.length) {
			this.s2.push(this.s1.pop());
		}
	}
}
