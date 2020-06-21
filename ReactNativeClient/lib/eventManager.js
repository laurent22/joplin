const events = require('events');

class EventManager {

	constructor() {
		this.emitter_ = new events.EventEmitter();
	}

	on(eventName, callback) {
		return this.emitter_.on(eventName, callback);
	}

	emit(eventName, object = null) {
		return this.emitter_.emit(eventName, object);
	}

	removeListener(eventName, callback) {
		return this.emitter_.removeListener(eventName, callback);
	}

	off(eventName, callback) {
		return this.removeListener(eventName, callback);
	}

	filterOn(filterName, callback) {
		return this.emitter_.on(`filter:${filterName}`, callback);
	}

	filterOff(filterName, callback) {
		return this.removeListener(`filter:${filterName}`, callback);
	}

	filterEmit(filterName, object) {
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

}

const eventManager = new EventManager();

module.exports = eventManager;
