import shim from '../shim';
const { useEffect, useRef } = shim.react();

function useEventListener(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	eventName: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	handler: any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	element?: any,
) {
	// Create a ref that stores handler
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const savedHandler = useRef<any>();

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
