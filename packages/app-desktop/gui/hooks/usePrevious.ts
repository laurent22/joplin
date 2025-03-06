import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function usePrevious<T>(value: T, initialValue: T = null): T {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
