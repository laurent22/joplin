import { useCallback, useState, useRef, RefObject } from 'react';

const useFocusVisible = (containerRef: RefObject<HTMLElement>, onFocusEnter: ()=> void) => {
	const [focusVisible, setFocusVisible] = useState(false);

	const onFocusEnterRef = useRef(onFocusEnter);
	onFocusEnterRef.current = onFocusEnter;

	const onFocus = useCallback(() => {
		if (containerRef.current.matches(':focus-visible')) {
			setFocusVisible(true);
			onFocusEnterRef.current();
		}
	}, [containerRef]);
	const onBlur = useCallback(() => setFocusVisible(false), []);

	return { focusVisible, onFocus, onBlur };
};

export default useFocusVisible;
