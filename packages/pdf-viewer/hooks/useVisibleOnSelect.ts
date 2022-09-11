import { useRef, useEffect, MutableRefObject } from 'react';

export interface VisibleOnSelect {
	container: MutableRefObject<HTMLElement>;
    wrapperRef: MutableRefObject<HTMLElement>;
	isVisible: boolean;
    isSelected: boolean;
}

// Used in thumbnail view, to scroll to the newly selected page.

const useVisibleOnSelect = ({ container, wrapperRef, isVisible, isSelected }: VisibleOnSelect) => {
	const isVisibleRef = useRef(isVisible);

	useEffect(() => {
		if (isSelected && !isVisibleRef.current) {
			container.current.scrollTop = wrapperRef.current.offsetTop;
		}
	}, [isSelected, isVisibleRef, container, wrapperRef]);

	useEffect(() => {
		isVisibleRef.current = isVisible;
	} , [isVisible]);

};

export default useVisibleOnSelect;
