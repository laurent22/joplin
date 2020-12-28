const events = require('events');

export class EventManager {

	private emitter_: any;
	private appStatePrevious_: any;
	private appStateWatchedProps_: string[];
	private appStateListeners_: any;

	constructor() {
		this.reset();
	}

	reset() {
		this.emitter_ = new events.EventEmitter();

		this.appStatePrevious_ = {};
		this.appStateWatchedProps_ = [];
		this.appStateListeners_ = {};
	}

	on(eventName: string, callback: Function) {
		return this.emitter_.on(eventName, callback);
	}

	emit(eventName: string, object: any = null) {
		return this.emitter_.emit(eventName, object);
	}

	removeListener(eventName: string, callback: Function) {
		return this.emitter_.removeListener(eventName, callback);
	}

	off(eventName: string, callback: Function) {
		return this.removeListener(eventName, callback);
	}

	filterOn(filterName: string, callback: Function) {
		return this.emitter_.on(`filter:${filterName}`, callback);
	}

	filterOff(filterName: string, callback: Function) {
		return this.removeListener(`filter:${filterName}`, callback);
	}

	filterEmit(filterName: string, object: any) {
		// We freeze the object we pass to the listeners so that they
		// don't modify it directly. Instead they must return a
		// modified copy (or the input itself).
		let output = Object.freeze(object);
		const listeners = this.emitter_.listeners(`filter:${filterName}`);
		for (const listener of listeners) {
			const newOutput = listener(output);

			if (newOutput === undefined) {
				throw new Error(`Filter "${filterName}": Filter must return a value or the unmodified input. Returning nothing or "undefined" is not supported.`);
			}

			if (newOutput !== output) {
				output = Object.freeze(newOutput);
			}
		}

		return output;
	}

	appStateOn(propName: string, callback: Function) {
		if (!this.appStateListeners_[propName]) {
			this.appStateListeners_[propName] = [];
			this.appStateWatchedProps_.push(propName);
		}

		this.appStateListeners_[propName].push(callback);
	}

	appStateOff(propName: string, callback: Function) {
		if (!this.appStateListeners_[propName]) {
			throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (1)');
		}

		const idx = this.appStateListeners_[propName].indexOf(callback);
		if (idx < 0) throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (2)');

		this.appStateListeners_[propName].splice(idx, 1);
	}

	stateValue_(state: any, propName: string) {
		const parts = propName.split('.');
		let s = state;
		for (const p of parts) {
			if (!(p in s)) throw new Error(`Invalid state property path: ${propName}`);
			s = s[p];
		}
		return s;
	}

	// This function works by keeping a copy of the watched props and, whenever this function
	// is called, comparing the previous and new values and emitting events if they have changed.
	// The appStateEmit function should be called from a middleware.
	appStateEmit(state: any) {
		if (!this.appStateWatchedProps_.length) return;

		for (const propName of this.appStateWatchedProps_) {
			let emit = false;

			const stateValue = this.stateValue_(state, propName);

			if (!(propName in this.appStatePrevious_) || this.appStatePrevious_[propName] !== stateValue) {
				this.appStatePrevious_[propName] = stateValue;
				emit = true;
			}

			if (emit) {
				const listeners = this.appStateListeners_[propName];
				if (!listeners || !listeners.length) continue;

				const eventValue = Object.freeze(stateValue);
				for (const listener of listeners) {
					listener({ value: eventValue });
				}
			}
		}
	}

}

const eventManager = new EventManager();

export default eventManager;
