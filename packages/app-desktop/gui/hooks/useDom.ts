import { useMemo } from 'react';

const useDom = (elementRef: Element|null) => {
	return useMemo(() => {
		return (elementRef ?? null)?.getRootNode() as Document|null;
	}, [elementRef]);
};

export default useDom;
