import React, { useLayoutEffect, useRef, useState } from 'react';
import { PdfData, ScaledSize } from './pdfSource';
import Page from './Page';

require('./pages.css');

export default function VerticalPages(props: {
	pdf: PdfData;
	isDarkTheme: boolean;
	anchorPage: number;
	container: any;
}) {
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const innerContainerEl = useRef(null);
	const resizeTimer = useRef<number>();
	useLayoutEffect(() => {
		const updateSize = async () => {
			if (innerContainerEl.current && props.pdf) {
				const innerWidth = innerContainerEl.current.clientWidth;
				const scaledSize = await props.pdf.getScaledSize(null, innerWidth - 10);
				setScaledSize(scaledSize);
			}
		};
		const onResize = () => {
			if (resizeTimer.current) {
				clearTimeout(resizeTimer.current);
			}
			resizeTimer.current = window.setTimeout(updateSize, 100);
		};
		window.addEventListener('resize', onResize);
		updateSize()
			.catch(console.error);
		return () => {
			window.removeEventListener('resize', onResize);
			if (resizeTimer.current) {
				clearTimeout(resizeTimer.current);
			}
		};
	}, [innerContainerEl.current, props.pdf]);

	return (<div className='pages-holder' ref={innerContainerEl} >
		{Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
			return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={props.anchorPage && props.anchorPage == i + 1}
				isAnchored={props.anchorPage && props.anchorPage == i + 1}
				isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
		}
		)}
	</div>);
}
