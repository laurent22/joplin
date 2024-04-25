import { useEffect, useState } from 'react';

// This uses a ResizeObserver -- be careful to prevent infinite loops (should be stopped
// early and print a warning). See https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors
const useElementHeight = (container: HTMLElement|null) => {
	const [height, setHeight] = useState(container?.clientHeight ?? 0);

	useEffect(() => {
		if (!container) return () => {};
		const observer = new ResizeObserver(() => {
			setHeight(container.clientHeight);
		});
		observer.observe(container);

		return () => {
			observer.disconnect();
		};
	}, [container]);

	return height;
};

export default useElementHeight;
