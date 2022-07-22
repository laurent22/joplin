type Listener<Value> = (data: Value)=> void;
type CallbackHandler<EventType> = (data: EventType)=> void;

/**
 * @param EventKeyType Event identifiers (e.g. an enum with ClickEvent)
 * @param EventType Type of data sent along with the event.
 */
export default class EventDispatcher<EventKeyType extends string|symbol|number, EventType> {
	// Partial marks all fields as optional. To initialize with an empty object, this is required.
	// See https://stackoverflow.com/a/64526384
	private listeners: Partial<Record<EventKeyType, Array<Listener<EventType>>>>;
	public constructor() {
		this.listeners = {};
	}

	dispatch(eventName: EventKeyType, event: EventType = null) {
		if (!this.listeners[eventName]) return;

		const ls = this.listeners[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](event);
		}
	}

	on(eventName: EventKeyType, callback: CallbackHandler<EventType>) {
		if (!this.listeners[eventName]) this.listeners[eventName] = [];
		this.listeners[eventName].push(callback);

		return {
			/**
			 * @returns false if the listener has already been removed, true otherwise.
			 */
			remove: () => {
				const originalListeners = this.listeners[eventName];
				this.off(eventName, callback);

				return originalListeners.length !== this.listeners[eventName].length;
			},
		};
	}

	/** Equivalent to calling `.remove()` on the object returned by `on`. */
	off(eventName: EventKeyType, callback: CallbackHandler<EventType>) {
		if (!this.listeners[eventName]) return;

		// Replace the current list of listeners with a new, shortened list.
		// This allows any iterators over this.listeners to continue iterating
		// without skipping elements.
		this.listeners[eventName] = this.listeners[eventName].filter(
			otherCallback => otherCallback !== callback
		);
	}
}
