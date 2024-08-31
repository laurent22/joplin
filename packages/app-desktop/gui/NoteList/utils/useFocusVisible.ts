import { useCallback, useState, useRef, RefObject } from 'react';

const useFocusVisible = (containerRef: RefObject<HTMLElement>, onFocusEnter: ()=> void) => {
	const [focusVisible, setFocusVisible] = useState(false);

	const onFocusEnterRef = useRef(onFocusEnter);
	onFocusEnterRef.current = onFocusEnter;
	const focusVisibleRef = useRef(focusVisible);
	focusVisibleRef.current = focusVisible;

	const onFocusVisible = useCallback(() => {
		if (!focusVisibleRef.current) {
			setFocusVisible(true);
			onFocusEnterRef.current();
		}
	}, []);

	const onFocus = useCallback(() => {
		if (containerRef.current.matches(':focus-visible')) {
			onFocusVisible();
		}
	}, [containerRef, onFocusVisible]);

	const onKeyUp = useCallback(() => {
		if (containerRef.current.contains(document.activeElement)) {
			onFocusVisible();
		}
	}, [containerRef, onFocusVisible]);

	const onBlur = useCallback(() => setFocusVisible(false), []);

	return {
		focusVisible,
		onFocus,

		// When focus becomes visible due to a key press, but the item was already
		// focused, no new focus event is emitted and the browser :focus-visible doesn't
		// change. As such, we need to handle this case ourselves.
		onKeyUp,

		onBlur,
	};
};

export default useFocusVisible;
