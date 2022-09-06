import shim from '../shim';
const { useCallback, useEffect, useState } = shim.react();
import useEventListener from './useEventListener';

interface Size {
  width: number;
  height: number;
}

function useElementSize(elementRef: any): Size {
	const [size, setSize] = useState({
		width: 0,
		height: 0,
	});

	// Prevent too many rendering using useCallback
	const updateSize = useCallback(() => {
		const node = elementRef?.current;
		if (node) {
			setSize({
				width: node.offsetWidth || 0,
				height: node.offsetHeight || 0,
			});
		}
	}, [elementRef]);

	// Initial size on mount
	useEffect(() => {
		updateSize();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	useEventListener('resize', updateSize);

	return size;
}

export default useElementSize;
