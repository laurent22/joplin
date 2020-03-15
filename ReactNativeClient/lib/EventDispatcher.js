class EventDispatcher {
	constructor() {
		this.listeners_ = [];
	}

	dispatch(eventName, event = null) {
		if (!this.listeners_[eventName]) return;

		const ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](event);
		}
	}

	on(eventName, callback) {
		if (!this.listeners_[eventName]) this.listeners_[eventName] = [];
		this.listeners_[eventName].push(callback);
	}

	off(eventName, callback) {
		if (!this.listeners_[eventName]) return;

		const ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			if (ls[i] === callback) {
				ls.splice(i, 1);
				return;
			}
		}
	}
}

module.exports = EventDispatcher;
