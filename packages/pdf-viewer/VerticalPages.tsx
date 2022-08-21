import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import { PdfData } from './pdfSource';
import Page from './Page';
import styled from 'styled-components';
import useScaledSize, { ScaledSizeParams } from './hooks/useScaledSize';


const PagesHolder = styled.div<{ pageGap: number }>`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: column;
	width: 100%;
	min-height: 100%;
	row-gap: ${(props)=> props.pageGap || 2}px;
`;

export interface VerticalPagesProps {
	pdf: PdfData;
	isDarkTheme: boolean;
	anchorPage?: number;
	rememberScroll?: boolean;
	pdfId?: string;
	container: MutableRefObject<HTMLElement>;
	pageGap?: number;
	showPageNumbers?: boolean;
}


export default function VerticalPages(props: VerticalPagesProps) {
	const [containerWidth, setContainerWidth] = useState<number>(null);
	const innerContainerEl = useRef<HTMLDivElement>(null);
	const scaledSize = useScaledSize({
		pdf: props.pdf,
		pdfId: props.pdfId,
		containerWidth,
		rememberScroll: props.rememberScroll,
		anchorPage: props.anchorPage,
		container: props.container,
		innerContainerEl,
		pageGap: props.pageGap,
	} as ScaledSizeParams);

	useEffect(() => {
		let resizeTimer: number = null;
		let cancelled = false;

		const updateWidth = () => {
			if (cancelled) return;
			setContainerWidth(innerContainerEl.current.clientWidth);
		};

		const onResize = () => {
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
			resizeTimer = window.setTimeout(updateWidth, 200);
		};

		updateWidth();
		window.addEventListener('resize', onResize);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
		};
	}, [props.pdf]);

	useEffect(() => {
		let scrollTimer: number = null;

		const saveScroll = () => {
			const scrollTop = props.container.current.scrollTop;
			if (props.rememberScroll && props.pdfId) {
				sessionStorage.setItem(`pdf.${props.pdfId}.scrollTop`, `${scrollTop}`);
			}
		};

		const onScroll = () => {
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
			scrollTimer = window.setTimeout(saveScroll, 200);
		};

		props.container.current.addEventListener('scroll', onScroll);

		return () => {
			props.container.current.removeEventListener('scroll', onScroll);
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
		};

	}, [props.container, props.pdfId, props.rememberScroll]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{scaledSize ?
			Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
				// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
				return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
					isAnchored={props.anchorPage && props.anchorPage === i + 1}
					showPageNumbers={props.showPageNumbers}
					isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
			}
			) : 'Calculating size...'
		}
	</PagesHolder>);
}
