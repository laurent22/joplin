import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import { PdfData, ScaledSize } from './pdfSource';
import Page from './Page';
import styled from 'styled-components';


const PagesHolder = styled.div<{ pageGap: number }>`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: column;
	width: fit-content;
	min-width: 100%;
	min-height: 100%;
	row-gap: ${(props)=> props.pageGap || 2}px;
`;

export interface VerticalPagesProps {
	pdf: PdfData;
	isDarkTheme: boolean;
	anchorPage?: number;
	container: MutableRefObject<HTMLElement>;
	zoom?: number;
	pageGap?: number;
}


export default function VerticalPages(props: VerticalPagesProps) {
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const currentZoom = useRef(props.zoom);
	const innerContainerEl = useRef<HTMLDivElement>(null);

	const updateSize = async (cancelled?: boolean) => {
		if (props.pdf) {
			const containerWidth = props.container.current.clientWidth - 20;
			const effectiveWidth = Math.min(containerWidth, 900) * (props.zoom || 1);
			const scaledSize_ = await props.pdf.getScaledSize(null, effectiveWidth);
			if (cancelled) return;
			innerContainerEl.current.style.height = `${(scaledSize_.height + (props.pageGap || 2)) * props.pdf.pageCount}px`;
			setScaledSize(scaledSize_);
		}
	};

	useEffect(() => {
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
		if (currentZoom.current && currentZoom.current !== props.zoom) {
			// console.log('zoom changed', currentZoom.current, props.zoom);
			updateSize().catch(console.error);
			currentZoom.current = props.zoom;
		}
	}, [props.zoom]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{Array.from(Array(props.pdf.pageCount).keys()).map((i: number) => {
			// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
			return <Page pdf={props.pdf} pageNo={i + 1} focusOnLoad={scaledSize && props.anchorPage && props.anchorPage === i + 1}
				isAnchored={props.anchorPage && props.anchorPage === i + 1}
				isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
		}
		)}
	</PagesHolder>);
}
