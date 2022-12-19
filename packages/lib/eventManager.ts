const fastDeepEqual = require('fast-deep-equal');

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

	public async filterEmit(filterName: string, object: any) {
		let output = object;
		const listeners = this.emitter_.listeners(`filter:${filterName}`);
		for (const listener of listeners) {
			// When we pass the object to the plugin, it is always going to be
			// modified since it is serialized/unserialized. So we need to use a
			// deep equality check to see if it's been changed. Normally the
			// filter objects should be relatively small so there shouldn't be
			// much of a performance hit.
			const newOutput = await listener(output);

			// Plugin didn't return anything - so we leave the object as it is.
			if (newOutput === undefined) continue;

			if (!fastDeepEqual(newOutput, output)) {
				output = newOutput;
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
