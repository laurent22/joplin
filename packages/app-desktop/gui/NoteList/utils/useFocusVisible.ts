import { useCallback, useState } from 'react';

const useFocusVisible = () => {
	const [focusVisible, setFocusVisible] = useState(false);

	const onFocus = useCallback(() => setFocusVisible(true), []);
	const onBlur = useCallback(() => setFocusVisible(false), []);

	return { focusVisible, onFocus, onBlur };
};

export default useFocusVisible;
