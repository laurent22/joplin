import { useLayoutEffect, useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import { PdfData, ScaledSize } from './pdfSource';
import Page from './Page';
import styled from 'styled-components';


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
	container: MutableRefObject<HTMLElement>;
	pageGap?: number;
	onPageClick?: (page: number)=> void;
	onActivePageChange?: (page: number)=> void;
}


export default function VerticalPages(props: VerticalPagesProps) {
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const currentScaleSize = useRef(scaledSize);
	const currentActivePage = useRef(1);
	const innerContainerEl = useRef<HTMLDivElement>(null);

	const updateSize = async (cancelled?: boolean) => {
		if (props.pdf) {
			const containerWidth = innerContainerEl.current.clientWidth - 10;
			const scaledSize_ = await props.pdf.getScaledSize(null, containerWidth);
			if (cancelled) return;
			innerContainerEl.current.style.height = `${(scaledSize_.height + (props.pageGap || 2)) * props.pdf.pageCount}px`;
			currentScaleSize.current = scaledSize_;
			setScaledSize(scaledSize_);
		}
	};

	useLayoutEffect(() => {
		let resizeTimer: number = null;
		let cancelled = false;

		const _updateSize = async () => {
			return updateSize(cancelled);
		};

		const onResize = () => {
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
			resizeTimer = window.setTimeout(_updateSize, 200);
		};

		window.addEventListener('resize', onResize);
		_updateSize()
			.catch(console.error);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
		};
	}, []);

	useEffect(() => {
		let scrollTimer: number = null;

		const saveScroll = () => {
			const scrollTop = props.container.current.scrollTop;
			if (props.onActivePageChange && currentScaleSize.current) {
				const activePage = props.pdf.getActivePageNo(currentScaleSize.current, props.pageGap || 2, scrollTop);
				if (currentActivePage.current !== activePage) {
					currentActivePage.current = activePage;
					props.onActivePageChange(activePage);
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

		props.container.current.addEventListener('scroll', onScroll);

		return () => {
			props.container.current.removeEventListener('scroll', onScroll);
			if (scrollTimer) {
				clearTimeout(scrollTimer);
				scrollTimer = null;
			}
		};

	}, []);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
			// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
			return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
				isAnchored={props.anchorPage && props.anchorPage === i + 1}
				onClick={props.onPageClick}
				isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
		}
		)}
	</PagesHolder>);
}
