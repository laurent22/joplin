import React, { useEffect, useRef, useState } from 'react';
import useIsVisible from './hooks/useIsVisible';
import { PdfData, ScaledSize } from './pdfSource';

require('./pages.css');

export default function Page(props: { pdf: PdfData; pageNo: number; focusOnLoad: boolean; isAnchored: boolean; scaledSize: ScaledSize; isDarkTheme: boolean; container: any }) {
	const [error, setError] = useState(null);
	const [page, setPage] = useState(null);
	const [scale, setScale] = useState(null);
	const [timestamp, setTimestamp] = useState(null);
	const canvasEl = useRef<HTMLCanvasElement>(null);
	const wrapperEl = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(canvasEl, props.container);

	useEffect(() => {
		const loader = async () => {
			if (!isVisible || !page || !props.scaledSize || (scale && props.scaledSize.scale == scale)) return;
			try {
				const viewport = page.getViewport({ scale: props.scaledSize.scale || 1.0 });
				const canvas = canvasEl.current;
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
						if (timestamp != pageTimestamp) {
							return;
						}
						cont();
					},
				});
				setScale(props.scaledSize.scale);

			} catch (err) {
				console.error('Error rendering page no.', props.pageNo, err);
				setError(err);
			}
		};
		loader()
			.catch(console.error);
	}, [page, props.scaledSize, isVisible]);

	useEffect(() => {
		if (page || !isVisible || !props.pdf) return;
		const loader = async () => {
			const page = await props.pdf.getPage(props.pageNo);
			setPage(page);
		};
		loader()
			.catch((err: Error) => {
				console.error('Page load error', props.pageNo, err);
				setError(err);
			});
	}, [props.pageNo, props.pdf, isVisible]);

	useEffect(() => {
		if (props.focusOnLoad && !!props.scaledSize && !!wrapperEl && !!props.container && !!wrapperEl.current && !!props.container.current) {
			props.container.current.scrollTop = wrapperEl.current.offsetTop;
			// console.warn('setting focus on page', props.pageNo, wrapperEl.current.offsetTop);
		}
	}, [wrapperEl.current, props.container.current, props.scaledSize]);

	let style: any = {};
	if (props.scaledSize) {
		style = {
			...style,
			width: props.scaledSize.width,
			height: props.scaledSize.height,
		};
	}
	return (
		<div className="page-wrapper" ref={wrapperEl} style={style}>
			<canvas ref={canvasEl} className="page-canvas" style={style}>
				<div>
					{error ? 'ERROR' : 'Loading..'}
				</div>
				Page {props.pageNo}
			</canvas>
			<div className="p-info">
				{props.isAnchored ? '📌' : ''} Page {props.pageNo}
			</div>
		</div>
	);
}
