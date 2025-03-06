import { useMemo } from 'react';

// Returns the Document that contains [elementRef]. This is useful when a component
// can be rendered in secondary windows and needs to access the component's container
// document.
const useDocument = (elementRef: Element|null) => {
	return useMemo(() => {
		return (elementRef ?? null)?.getRootNode() as Document|null;
	}, [elementRef]);
};

export default useDocument;
