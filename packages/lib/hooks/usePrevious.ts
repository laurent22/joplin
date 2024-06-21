import shim from '../shim';

const { useRef, useEffect } = shim.react();

const usePrevious = <T> (value: T, initialValue: T = null) => {
	const ref = useRef<T>(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};

export default usePrevious;
