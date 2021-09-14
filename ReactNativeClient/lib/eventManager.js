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

}

const eventManager = new EventManager();

module.exports = eventManager;
