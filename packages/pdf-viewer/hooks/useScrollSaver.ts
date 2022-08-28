import { useRef, useEffect, MutableRefObject } from 'react';
import { ScaledSize } from '../pdfSource';

export interface ScrollSaver {
	container: MutableRefObject<HTMLElement>;
	scaledSize: ScaledSize;
	pdfId: string;
	rememberScroll: boolean;
}

const useScrollSaver = ({ container, scaledSize, pdfId, rememberScroll }: ScrollSaver) => {
	const currentScaleSize = useRef(scaledSize);

	useEffect(() => {
		let scrollTimer: number = null;
		const containerElement = container.current;

		const saveScroll = () => {
			if (!currentScaleSize.current) return;
			const scale = currentScaleSize.current.scale;
			const scrollTop = container.current.scrollTop / scale;
			if (rememberScroll && pdfId) {
				sessionStorage.setItem(`pdf.${pdfId}.scrollTop`, `${scrollTop}`);
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
	}, [container, pdfId, rememberScroll, currentScaleSize]);

	useEffect(() => {
		currentScaleSize.current = scaledSize;
	} , [scaledSize]);

	return scaledSize;
};

export default useScrollSaver;
