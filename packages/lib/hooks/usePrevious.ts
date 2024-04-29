import shim from '../shim';

const { useRef, useEffect } = shim.react();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const usePrevious = (value: any, initialValue: any = null) => {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};

export default usePrevious;
