import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { useState } from 'react';

const useDebounced = <T> (value: T, interval: number) => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useQueuedAsyncEffect(() => {
		setDebouncedValue(value);
	}, [value], { interval });

	return debouncedValue;
};

export default useDebounced;
