import React, { useEffect, useState } from 'react';


const useIsVisible = (elementRef: React.MutableRefObject<HTMLElement>, rootRef: React.MutableRefObject<HTMLElement>) => {
	const [isVisible, setIsVisible] = useState(false);
	useEffect(() => {
		let observer: IntersectionObserver = null;
		if (elementRef.current) {
			observer = new IntersectionObserver((entries, _observer) => {
				let visable = false;
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						visable = true;
						setIsVisible(true);
					}
				});
				if (!visable) {
					setIsVisible(false);
				}
			}, {
				root: rootRef.current,
				rootMargin: '0px 0px 0px 0px',
				threshold: 0,
			});
			observer.observe(elementRef.current);
		}
		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	}, [elementRef]);

	return isVisible;
};

export default useIsVisible;
