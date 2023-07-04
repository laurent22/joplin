import { useEffect, useState, MutableRefObject, useRef } from 'react';


const useIsVisible = (elementRef: MutableRefObject<HTMLElement>, rootRef: MutableRefObject<HTMLElement>) => {
	const [isVisible, setIsVisible] = useState(false);
	const lastVisible = useRef(0);
	const invisibleOn = useRef(0);

	useEffect(() => {
		let observer: IntersectionObserver = null;
		let timeout: number = null;
		if (elementRef.current) {
			observer = new IntersectionObserver((entries, _observer) => {
				let visible = false;
				// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						visible = true;
						lastVisible.current = Date.now();
						if ((invisibleOn.current - lastVisible.current) > 300) {
							setIsVisible(true);
						} else {
							if (!timeout) {
								timeout = window.setTimeout(() => {
									if (invisibleOn.current < lastVisible.current) {
										setIsVisible(true);
									}
									timeout = null;
								}, 300);
							}
						}
					}
				});
				if (!visible) {
					invisibleOn.current = Date.now();
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
			if (timeout) {
				window.clearTimeout(timeout);
				timeout = null;
			}
		};
	}, [elementRef, rootRef]);

	return isVisible;
};

export default useIsVisible;
