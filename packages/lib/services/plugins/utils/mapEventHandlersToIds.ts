let eventHandlerIndex_ = 1;

export interface EventHandlers {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	[key: string]: Function;
}

export default function mapEventHandlersToIds(arg: any, eventHandlers: EventHandlers) {
	if (Array.isArray(arg)) {
		for (let i = 0; i < arg.length; i++) {
			arg[i] = mapEventHandlersToIds(arg[i], eventHandlers);
		}
		return arg;
	} else if (typeof arg === 'function') {
		const id = `___plugin_event_${eventHandlerIndex_}`;
		eventHandlerIndex_++;
		eventHandlers[id] = arg;
		return id;
	} else if (arg === null) {
		return null;
	} else if (arg === undefined) {
		return undefined;
	} else if (typeof arg === 'object') {
		for (const n in arg) {
			arg[n] = mapEventHandlersToIds(arg[n], eventHandlers);
		}
	}

	return arg;
}
