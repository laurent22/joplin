import { useState, useCallback } from 'react';

export default function useFocus() {
	const [focused, setFocused] = useState(false);

	const onFocus = useCallback(() => {
		setFocused(true);
	}, []);

	const onBlur = useCallback(() => {
		setFocused(false);
	}, []);

	return { focused, onFocus, onBlur };
}
