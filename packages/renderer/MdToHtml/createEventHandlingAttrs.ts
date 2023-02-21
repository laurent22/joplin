

import utils from '../utils';


export interface Options {
	enableLongPress: boolean;
	postMessageSyntax: string;
}

// longPressTouchStart and clearLongPressTimeout are turned into strings before being called.
// Thus, they should not reference any other non-builtin functions.
const longPressTouchStartFnString = `(onLongPress, longPressDelay) => {
	// if touchTimeout is set when ontouchstart is called it means the user has already touched
	// the screen once and this is the 2nd touch in this case we assume the user is trying
	// to zoom and we don't want to show the menu
	if (!!window.touchTimeout) {
		clearTimeout(window.touchTimeout);
		window.touchTimeout = null;
	} else {
		window.touchTimeout = setTimeout(() => {
			window.touchTimeout = null;
			onLongPress();
		}, longPressDelay);
	}
}`;

const clearLongPressTimeoutFnString = `() => {
	if (window.touchTimeout) {
		clearTimeout(window.touchTimeout);
		window.touchTimeout = null;
	}
}`;

// Helper for createEventHandlingAttrs. Exported to facilitate testing.
export const createEventHandlingListeners = (resourceId: string, options: Options, onClickAction: string|null) => {
	const eventHandlers = {
		ontouchstart: '',
		ontouchmove: '',
		ontouchend: '',
		ontouchcancel: '',
		onmouseenter: '',
		onmouseleave: '',
		onclick: '',
	};

	if (options.enableLongPress) {
		const longPressHandler = `(() => ${options.postMessageSyntax}('longclick:${resourceId}'))`;
		const touchStart = `(${longPressTouchStartFnString})(${longPressHandler}, ${utils.longPressDelay}); `;

		const callClearLongPressTimeout = `(${clearLongPressTimeoutFnString})(); `;
		const touchCancel = callClearLongPressTimeout;
		const touchEnd = callClearLongPressTimeout;

		eventHandlers.ontouchstart += touchStart;
		eventHandlers.ontouchcancel += touchCancel;
		eventHandlers.ontouchmove += touchCancel;
		eventHandlers.ontouchend += touchEnd;
	}

	if (onClickAction) {
		eventHandlers.onclick += onClickAction;
	}

	return eventHandlers;
};

// Adds event-handling (e.g. long press) code to images and links.
// resourceId is the ID of the image resource or link.
const createEventHandlingAttrs = (resourceId: string, options: Options, onClickAction: string|null) => {
	const eventHandlers = createEventHandlingListeners(resourceId, options, onClickAction);

	// Build onfoo="listener" strings and add them to the result.
	let result = '';
	for (const listenerType in eventHandlers) {
		const eventHandlersDict = eventHandlers as Record<string, string>;

		// Only create code for non-empty listeners.
		if (eventHandlersDict[listenerType].length > 0) {
			const listener = eventHandlersDict[listenerType].replace(/["]/g, '&quot;');
			result += ` ${listenerType}="${listener}" `;
		}
	}

	return result;
};

export default createEventHandlingAttrs;
