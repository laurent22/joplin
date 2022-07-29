import React, { useLayoutEffect, useRef, useState } from 'react';
import { PdfData, ScaledSize } from './pdfSource';
import Page from './Page';

require('./pages.css');


export interface VerticalPagesProps {
	pdf: PdfData;
	isDarkTheme: boolean;
	anchorPage: number;
	container: React.MutableRefObject<HTMLElement>;
}


export default function VerticalPages(props: VerticalPagesProps) {
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const innerContainerEl = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		let resizeTimer: number = null;
		let cancelled = false;
		const updateSize = async () => {
			if (props.pdf) {
				const innerWidth = innerContainerEl.current.clientWidth;
				const scaledSize = await props.pdf.getScaledSize(null, innerWidth - 10);
				if (cancelled) return;
				setScaledSize(scaledSize);
			}
		};
		const onResize = () => {
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
			resizeTimer = window.setTimeout(updateSize, 200);
		};
		window.addEventListener('resize', onResize);
		updateSize()
			.catch(console.error);
		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
		};
	}, [props.pdf]);

	return (<div className='pages-holder' ref={innerContainerEl} >
		{Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
			// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
			return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
				isAnchored={props.anchorPage && props.anchorPage === i + 1}
				isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
		}
		)}
	</div>);
}
