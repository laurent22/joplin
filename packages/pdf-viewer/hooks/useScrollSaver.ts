import { useRef, useEffect, MutableRefObject, useState } from 'react';
import { ScaledSize, PdfData } from '../pdfSource';

export interface ScrollSaver {
	container: MutableRefObject<HTMLElement>;
	scaledSize: ScaledSize;
	pdfId: string;
	rememberScroll: boolean;
	onActivePageChange?: (activePage: number)=> void;
	pdf: PdfData;
	pageGap?: number;
}

const useScrollSaver = ({ container, scaledSize, pdfId, rememberScroll, onActivePageChange, pdf, pageGap }: ScrollSaver) => {
	const currentScaleSize = useRef(scaledSize);
	const [currentActivePage, setCurrentActivePage] = useState(1);
	const currentActivePageRef = useRef(currentActivePage);

	useEffect(() => {
		let scrollTimer: number = null;
		const containerElement = container.current;

		const saveScroll = () => {
			if (!currentScaleSize.current) return;
			const scale = currentScaleSize.current.scale;
			const pdfScrollTop = container.current.scrollTop / scale;
			if (rememberScroll && pdfId) {
				sessionStorage.setItem(`pdf.${pdfId}.scrollTop`, `${pdfScrollTop}`);
			}
			if (onActivePageChange && currentScaleSize.current) {
				const activePage = pdf.getActivePageNo(currentScaleSize.current, pageGap || 2, container.current.scrollTop);
				if (currentActivePageRef.current !== activePage) {
					// console.log('Active page changed', activePage, container.current.scrollTop);
					currentActivePageRef.current = activePage;
					onActivePageChange(activePage);
					setCurrentActivePage(activePage);
				}
			}
		};

		const onScroll = () => {
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
			scrollTimer = window.setTimeout(saveScroll, 200);
		};

		containerElement.addEventListener('scroll', onScroll);

		return () => {
			containerElement.removeEventListener('scroll', onScroll);
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
		};
	}, [container, pdfId, rememberScroll, currentScaleSize, onActivePageChange, pdf, pageGap]);

	useEffect(() => {
		currentScaleSize.current = scaledSize;
	} , [scaledSize]);
};

export default useScrollSaver;
