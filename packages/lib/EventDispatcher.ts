type Listener<Value> = (data: Value)=> void;

/**
 * Sends notifications/allows listening for events.
 *
 * @param EventKeyType Possible identifiers for events.
 * @param EventType Type of data associated with events.
 */
export default class EventDispatcher<EventKeyType extends string|symbol|number, EventType> {
	// Partial marks all fields as optional. To initialize with an empty object, this is required.
	// See https://stackoverflow.com/a/64526384
	private listeners: Partial<Record<EventKeyType, Array<Listener<EventType>>>>;
	public constructor() {
		this.listeners = {};
	}

	/**
	 * Sends a notification to all listeners subscribed to the given [notificationKind].
	 * @param eventType Type of the notification.
	 * @param value Data associated with the notification.
	 */
	dispatch(eventName: EventKeyType, event: EventType = null) {
		if (!this.listeners[eventName]) return;

		const ls = this.listeners[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](event);
		}
	}

	/**
	 * Listen for a specific type of event.
	 *
	 * @param eventType Type of event that causes `callback` to be called.
	 * @param callback Callback called when an event of `eventType` is fired.
	 * @returns An object with a `remove` function. Calling `remove` unregisters the listener.
	 */
	on(eventName: EventKeyType, callback: (data: EventType)=> void) {
		if (!this.listeners[eventName]) this.listeners[eventName] = [];
		this.listeners[eventName].push(callback);

		return {
			/**
			 * Stop listening.
			 * @return false if the listener has already been removed, true otherwise.
			 */
			remove: () => {
				const originalListeners = this.listeners[eventName];
				this.listeners[eventName] = this.listeners[eventName].filter(
					listener => listener !== callback
				);

				return originalListeners.length !== this.listeners[eventName].length;
			},
		};
	}

	/**
	 * Remove a listener. Equivalent to calling `.remove()` on the object returned
	 * by `on`.
	 * @see on
	 */
	off(eventName: EventKeyType, callback: (data: EventType)=> void) {
		if (!this.listeners[eventName]) return;

		const ls = this.listeners[eventName];
		for (let i = 0; i < ls.length; i++) {
			if (ls[i] === callback) {
				ls.splice(i, 1);
				return;
			}
		}
	}
}
