import { type RefObject } from 'react';
import shim from '../shim';
const { useEffect, useRef } = shim.react();

type EventHandler = (event: Event)=> void;

function useEventListener(
	eventName: string,
	handler: EventHandler,
	element?: RefObject<EventTarget | null>,
) {
	// Create a ref that stores handler
	const savedHandler = useRef<EventHandler | undefined>(undefined);

	useEffect(() => {
		// Define the listening target
		const targetElement = element?.current || window;
		if (!(targetElement && targetElement.addEventListener)) {
			return null;
		}

		// Update saved handler if necessary
		if (savedHandler.current !== handler) {
			savedHandler.current = handler;
		}

		// Create event listener that calls handler function stored in ref
		const eventListener = (event: Event) => {
			// eslint-disable-next-line no-extra-boolean-cast
			if (!!savedHandler?.current) {
				savedHandler.current(event);
			}
		};

		targetElement.addEventListener(eventName, eventListener);

		// Remove event listener on cleanup
		return () => {
			targetElement.removeEventListener(eventName, eventListener);
		};
	}, [eventName, element, handler]);
}

export default useEventListener;
