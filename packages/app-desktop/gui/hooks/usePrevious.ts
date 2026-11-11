import { useEffect, useRef } from 'react';

export default function usePrevious<T>(value: T, initialValue: T = null): T {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
