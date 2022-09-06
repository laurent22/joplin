import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import useIsVisible from './hooks/useIsVisible';
import PdfDocument from './PdfDocument';
import { ScaledSize } from './types';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import styled from 'styled-components';

const PageWrapper = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	border: solid thin rgba(120, 120, 120, 0.498);
	background: rgb(233, 233, 233);
	position: relative;
	border-radius: 0px;
`;

const PageInfo = styled.div`
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	padding: 0.3rem;
	background: rgba(203, 203, 203, 0.509);
	border-radius: 0.3rem;
	font-size: 0.8rem;
	color: rgba(91, 91, 91, 0.829);
	backdrop-filter: blur(0.5rem);
	cursor: default;
	user-select: none;
	&:hover{
        opacity: 0.3;
    }
`;

export interface PageProps {
	pdfDocument: PdfDocument;
	pageNo: number;
	focusOnLoad: boolean;
	isAnchored: boolean;
	scaledSize: ScaledSize;
	isDarkTheme: boolean;
	container: MutableRefObject<HTMLElement>;
	showPageNumbers?: boolean;
}


export default function Page(props: PageProps) {
	const [error, setError] = useState(null);
	const [page, setPage] = useState(null);
	const scaleRef = useRef<number>(null);
	const timestampRef = useRef<number>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(canvasRef, props.container);

	useEffect(() => {
		if (!isVisible || !page || !props.scaledSize || (scaleRef.current && props.scaledSize.scale === scaleRef.current)) return;
		try {
			const viewport = page.getViewport({ scale: props.scaledSize.scale || 1.0 });
			const canvas = canvasRef.current;
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');
			const pageTimestamp = new Date().getTime();
			timestampRef.current = pageTimestamp;
			page.render({
				canvasContext: ctx,
				viewport,
				// Used so that the page rendering is throttled to some extent.
				// https://stackoverflow.com/questions/18069448/halting-pdf-js-page-rendering
				continueCallback: function(cont: any) {
					if (timestampRef.current !== pageTimestamp) {
						return;
					}
					cont();
				},
			});
			scaleRef.current = props.scaledSize.scale;

		} catch (error) {
			error.message = `Error rendering page no. ${props.pageNo}: ${error.message}`;
			setError(error);
			throw error;
		}
	}, [page, props.scaledSize, isVisible, props.pageNo]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (page || !isVisible || !props.pdfDocument) return;
		try {
			const _page = await props.pdfDocument.getPage(props.pageNo);
			if (event.cancelled) return;
			setPage(_page);
		} catch (error) {
			console.error('Page load error', props.pageNo, error);
			setError(error);
		}
	}, [page, props.scaledSize, isVisible]);

	useEffect(() => {
		if (props.focusOnLoad) {
			props.container.current.scrollTop = wrapperRef.current.offsetTop;
			// console.warn('setting focus on page', props.pageNo, wrapperRef.current.offsetTop);
		}
	}, [props.container, props.focusOnLoad]);

	let style: any = {};
	if (props.scaledSize) {
		style = {
			...style,
			width: props.scaledSize.width,
			height: props.scaledSize.height,
		};
	}

	return (
		<PageWrapper ref={wrapperRef} style={style}>
			<canvas ref={canvasRef} className="page-canvas" style={style}>
				<div>
					{error ? 'ERROR' : 'Loading..'}
				</div>
				Page {props.pageNo}
			</canvas>
			{props.showPageNumbers && <PageInfo>{props.isAnchored ? '📌' : ''} Page {props.pageNo}</PageInfo>}
		</PageWrapper>
	);
}
