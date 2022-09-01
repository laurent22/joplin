import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import { PdfData } from './pdfSource';
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
	pdf: PdfData;
	isDarkTheme: boolean;
	anchorPage?: number;
	rememberScroll?: boolean;
	pdfId?: string;
	zoom?: number;
	container: MutableRefObject<HTMLElement>;
	pageGap?: number;
	showPageNumbers?: boolean;
	selectedPage?: number;
	textSelectable?: boolean;
	onTextSelect?: (text: string)=> void;
	onPageClick?: (page: number)=> void;
	onActivePageChange?: (page: number)=> void;
	onDoubleClick?: (page: number)=> void;
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
		zoom: props.zoom,
	} as ScaledSizeParams);

	useScrollSaver({
		container: props.container,
		scaledSize,
		pdfId: props.pdfId,
		rememberScroll: props.rememberScroll,
		pdf: props.pdf,
		pageGap: props.pageGap,
		onActivePageChange: props.onActivePageChange,
	} as ScrollSaver);

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
	}, [props.container, props.pdf]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{scaledSize ?
			Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
				// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
				return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
					isAnchored={props.anchorPage && props.anchorPage === i + 1}
					showPageNumbers={props.showPageNumbers}
					isSelected={scaledSize && props.selectedPage && props.selectedPage === i + 1}
					onClick={props.onPageClick}
					textSelectable={props.textSelectable}
					onTextSelect={props.onTextSelect}
					onDoubleClick={props.onDoubleClick}
					isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
			}
			) : 'Calculating size...'
		}
	</PagesHolder>);
}
