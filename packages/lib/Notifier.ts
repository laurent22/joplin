
type Listener<Value> = (data: Value)=> void;

/**
 * Sends/receives notifications between objects with an instance of this.
 * @param Key Type of keys used for notifications (e.g. an `enum` containing all possible
 *          notification types)
 * @param Value Type of data passed with each notification. Perhaps a `type Foo = Bar | Baz`,
 *              where `Bar` corresponds to one value of `K` and `Baz` to another.
 */
export default class Notifier<Key extends string|symbol|number, Value> {
	// Partial marks all fields as optional. To initialize with an empty object, this is required.
	// See https://stackoverflow.com/a/64526384
	private listeners: Partial<Record<Key, Array<Listener<Value>>>>;
	public constructor() {
		this.listeners = {};
	}

	/**
	 * Sends a notification to all listeners subscribed to the given [notificationKind].
	 * @param eventType Type of the notification.
	 * @param value Data associated with the notification.
	 */
	public notifyAll(eventType: Key, value: Value) {
		if (!this.listeners[eventType]) {
			return;
		}

		const listeners = this.listeners[eventType];
		for (const listener of listeners) {
			listener(value);
		}
	}

	/**
	 * Listen for a specific type of event.
	 *
	 * @param eventType Type of event that causes `listener` to be called.
	 * @param listener Callback called when an event of `eventType` is fired.
	 * @returns An object with a `remove` function. Calling `remove` unregisters the listener.
	 */
	public addListener(eventType: Key, listener: (data: Value)=> void) {
		if (this.listeners[eventType] == null) {
			this.listeners[eventType] = [];
		}

		this.listeners[eventType].push(listener);

		return {
			/**
			 * Stop listening.
			 * @return false if the listener has already been removed, true otherwise.
			 */
			remove: () => {
				let removed = false;

				const listeners = this.listeners[eventType];
				const newListeners = [];
				for (const other of listeners) {
					if (other !== listener) {
						newListeners.push(other);
					} else {
						removed = true;
					}
				}
				this.listeners[eventType] = newListeners;

				return removed;
			},
		};
	}

	/** @returns a `Promise` that resolves when an event of type [eventType] is fired. */
	public waitFor(eventType: Key): Promise<Value> {
		return new Promise((resolve) => {
			const listener = this.addListener(eventType, (value) => {
				listener.remove();
				resolve(value);
			});
		});
	}
}
