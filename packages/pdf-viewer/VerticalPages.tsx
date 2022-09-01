import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import PdfDocument from './PdfDocument';
import Page from './Page';
import styled from 'styled-components';
import useScaledSize, { ScaledSizeParams } from './hooks/useScaledSize';
import useScrollSaver, { ScrollSaver } from './hooks/useScrollSaver';


const PagesHolder = styled.div<{ pageGap: number }>`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: column;
	width: fit-content;
	min-width: 100%;
	min-height: fit-content;
	row-gap: ${(props)=> props.pageGap || 2}px;
`;

export interface VerticalPagesProps {
	pdfDocument: PdfDocument;
	isDarkTheme: boolean;
	anchorPage?: number;
	rememberScroll?: boolean;
	pdfId?: string;
	zoom?: number;
	container: MutableRefObject<HTMLElement>;
	pageGap: number;
	showPageNumbers?: boolean;
	onActivePageChange?: (page: number)=> void;
}

export default function VerticalPages(props: VerticalPagesProps) {
	const [containerWidth, setContainerWidth] = useState<number>(null);
	const innerContainerEl = useRef<HTMLDivElement>(null);

	const scaledSize = useScaledSize({
		pdfDocument: props.pdfDocument,
		pdfId: props.pdfId,
		containerWidth,
		rememberScroll: props.rememberScroll,
		anchorPage: props.anchorPage,
		container: props.container,
		innerContainerEl,
		pageGap: props.pageGap,
		zoom: props.zoom,
	} as ScaledSizeParams);

	useScrollSaver({
		container: props.container,
		scaledSize,
		pdfId: props.pdfId,
		rememberScroll: props.rememberScroll,
		pdfDocument: props.pdfDocument,
		pageGap: props.pageGap,
		onActivePageChange: props.onActivePageChange,
	} as ScrollSaver);

	useEffect(() => {
		let resizeTimer: number = null;
		let cancelled = false;

		const updateWidth = () => {
			if (cancelled) return;
			setContainerWidth(props.container.current.clientWidth);
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
	}, [props.container, props.pdfDocument]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{scaledSize ?
			Array.from(Array(props.pdfDocument.pageCount).keys()).map((i: number) => {
				// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
				return <Page pdfDocument={props.pdfDocument} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
					isAnchored={props.anchorPage && props.anchorPage === i + 1}
					showPageNumbers={props.showPageNumbers}
					isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
			}
			) : 'Calculating size...'
		}
	</PagesHolder>);
}
