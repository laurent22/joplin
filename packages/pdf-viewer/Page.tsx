import React, { useEffect, useRef, useState } from 'react';
import useIsVisible from './hooks/useIsVisible';
import { PdfData, ScaledSize } from './pdfSource';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';

require('./pages.css');

export interface PageProps {
	pdf: PdfData;
	pageNo: number;
	focusOnLoad: boolean;
	isAnchored: boolean;
	scaledSize: ScaledSize;
	isDarkTheme: boolean;
	container: React.MutableRefObject<HTMLElement>;
}


export default function Page(props: PageProps) {
	const [error, setError] = useState(null);
	const [page, setPage] = useState(null);
	const [scale, setScale] = useState(null);
	const [timestamp, setTimestamp] = useState(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(canvasRef, props.container);

	useEffect(() => {
		if (!isVisible || !page || !props.scaledSize || (scale && props.scaledSize.scale === scale)) return;
		try {
			const viewport = page.getViewport({ scale: props.scaledSize.scale || 1.0 });
			const canvas = canvasRef.current;
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');
			const pageTimestamp = new Date().getTime();
			setTimestamp(pageTimestamp);
			page.render({
				canvasContext: ctx,
				viewport,
				// Used so that the page rendering is throttled to some extent.
				// https://stackoverflow.com/questions/18069448/halting-pdf-js-page-rendering
				continueCallback: function(cont: any) {
					if (timestamp !== pageTimestamp) {
						return;
					}
					cont();
				},
			});
			setScale(props.scaledSize.scale);

		} catch (error) {
			error.message = `Error rendering page no. ${props.pageNo}: ${error.message}`;
			setError(error);
			throw error;
		}
	}, [page, props.scaledSize, isVisible]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (page || !isVisible || !props.pdf) return;
		try {
			const _page = await props.pdf.getPage(props.pageNo);
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
	}, [props.focusOnLoad]);

	let style: any = {};
	if (props.scaledSize) {
		style = {
			...style,
			width: props.scaledSize.width,
			height: props.scaledSize.height,
		};
	}

	return (
		<div className="page-wrapper" ref={wrapperRef} style={style}>
			<canvas ref={canvasRef} className="page-canvas" style={style}>
				<div>
					{error ? 'ERROR' : 'Loading..'}
				</div>
				Page {props.pageNo}
			</canvas>
			<div className="page-info">
				{props.isAnchored ? '📌' : ''} Page {props.pageNo}
			</div>
		</div>
	);
}
