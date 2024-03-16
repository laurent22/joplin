import shim from '../shim';

const { useRef, useEffect } = shim.react();

const usePrevious = (value: any, initialValue: any = null) => {
	const ref = useRef(initialValue);
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};

export default usePrevious;
