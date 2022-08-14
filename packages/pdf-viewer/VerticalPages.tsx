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
	rememberScroll?: boolean;
	pdfId?: string;
	container: MutableRefObject<HTMLElement>;
	pageGap?: number;
	showPageNumbers?: boolean;
}


export default function VerticalPages(props: VerticalPagesProps) {
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const currentScaleSize = useRef(scaledSize);
	const innerContainerEl = useRef<HTMLDivElement>(null);

	const updateSize = async (cancelled?: boolean) => {
		if (props.pdf) {
			const containerWidth = innerContainerEl.current.clientWidth - 10;
			const scaledSize_ = await props.pdf.getScaledSize(null, containerWidth);
			if (cancelled) return;
			innerContainerEl.current.style.height = `${(scaledSize_.height + (props.pageGap || 2)) * props.pdf.pageCount}px`;
			const oldScaleSize = currentScaleSize.current;
			if (oldScaleSize && props.container.current) {
				const oldScrollTop = props.container.current.scrollTop;
				props.container.current.scrollTop = oldScrollTop * (scaledSize_.scale / oldScaleSize.scale);
			}
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

		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = null;
			}
		};
	}, [props.pdf]);


	useLayoutEffect(() => {
		const _updateSize = async () => {
			await updateSize();
			if (props.rememberScroll && props.pdfId) {
				const scrollOffset = parseInt(sessionStorage.getItem(`pdf.${props.pdfId}.scrollTop`), 10) || null;
				if (scrollOffset && !props.anchorPage) {
					props.container.current.scrollTop = scrollOffset;
					// console.log('scroll set',props.container.current.scrollTop);
				}
			}
		};

		_updateSize()
			.catch(console.error);
	}, [props.pdf, props.pdfId, props.rememberScroll, props.anchorPage]);


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

	}, [props.pdfId, props.rememberScroll]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
			// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
			return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
				isAnchored={props.anchorPage && props.anchorPage === i + 1}
				showPageNumbers={props.showPageNumbers}
				isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
		}
		)}
	</PagesHolder>);
}
