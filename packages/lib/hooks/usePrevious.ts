import { useEffect, useRef } from 'react';

export default function usePrevious(value: any, initialValue:any = null): any {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}
