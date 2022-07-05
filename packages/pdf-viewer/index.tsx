import React, { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
const pdfjsLib = require('pdfjs-dist');

require('./viewer.css');

// Setting worker path to worker bundle.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';


const useIsVisible = (elementRef: any, rootRef: any) => {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (elementRef.current) {
			const observer = new IntersectionObserver((entries, observer) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsVisible(true);
						observer.unobserve(elementRef.current);
					}
				});
			}, {
				root: rootRef.current,
				rootMargin: '0px 0px 0px 0px',
				threshold: 0,
			});
			observer.observe(elementRef.current);
		}
	}, [elementRef]);

	return isVisible;
};

function Page(props: { pdf: PdfData; pageNo: number; scaledSize: ScaledSize; isDarkTheme: boolean; container: any }) {
	const [error, setError] = useState(null);
	const canvasEl = useRef<HTMLCanvasElement>(null);
	const isVisible = useIsVisible(canvasEl, props.container);
	useEffect(() => {
		const loader = async () => {
			if (!isVisible || !props.pdf || !props.scaledSize) return;
			try {
				const page = await props.pdf.getPage(props.pageNo);
				const viewport = page.getViewport({ scale: props.scaledSize.scale || 1.0 });
				const canvas = canvasEl.current;
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				const ctx = canvas.getContext('2d');

				page.render({
					canvasContext: ctx,
					viewport,
				});

				console.log('page loaded:', props.pageNo);
				// return renderTask.promise;
			} catch (err) {
				console.log('Error loading page no.', props.pageNo, err);
				setError(err);
			}
		};
		loader()
			.catch(console.error);
	}, [props.pageNo, props.scaledSize, props.pdf, isVisible]);

	let style: any = {
		// borderColor: isVisible ? 'green' : 'red',
	};
	if (props.scaledSize) {
		style = {
			...style,
			width: props.scaledSize.width,
			height: props.scaledSize.height,
		};
	}
	return (
		<div className="page-wrapper" style={style}>
			<canvas ref={canvasEl} className="page-canvas">
				<div>
					{error ? 'ERROR' : 'Loading..'}
				</div>
				Page {props.pageNo}
			</canvas>
		</div>
	);
}

interface ScaledSize {
	height: number;
	width: number;
	scale: number;
}
class PdfData {
	public url: string;
	private doc: any = null;
	public pageCount: number = null;
	private pages: any = {};
	private pageSize: {
		height: number;
		width: number;
	} = null;
	public error: any = null;
	public constructor() {
	}
	public loadDoc = async (url: string) => {
		this.url = url;
		const loadingTask = pdfjsLib.getDocument(url);
		try {
			const pdfDocument: any = await loadingTask.promise;
			this.doc = pdfDocument;
			this.pageCount = pdfDocument.numPages;
		} catch (err) {
			console.error(`Error: ${err}`);
			this.error = err;
		}
	};
	public getPage = async (pageNo: number) => {
		if (!this.doc) {
			throw new Error('Document not loaded');
		}
		if (!this.pages[pageNo]) {
			this.pages[pageNo] = await this.doc.getPage(pageNo);
		}
		return this.pages[pageNo];
	};
	public getPageSize = async () => {
		if (!this.pageSize) {
			const page = await this.getPage(1);
			const viewport = page.getViewport({ scale: 1.0 });
			this.pageSize = {
				height: viewport.height,
				width: viewport.width,
			};
		}
		return this.pageSize;
	};
	public getScaledSize = async (height: number = null, width: number = null): Promise<ScaledSize> => {
		const actualSize = await this.getPageSize();
		let scale = 1.0;
		if (height && width) {
			scale = Math.min(height / actualSize.height, width / actualSize.width);
		} else if (height) {
			scale = height / actualSize.height;
		} else if (width) {
			scale = width / actualSize.width;
		}
		return {
			height: actualSize.height * scale,
			width: actualSize.width * scale,
			scale,
		};
	};
	//
	// // @ts-ignore Todo
	// scrollPosYToPageNo = async (pageSize: ScaledSize, scrollTop: number) => {
	//
	// };
	// // @ts-ignore Todo
	// scrollPosXToPageNo = async (pageSize: ScaledSize, scrollLeft: number) => {
	//
	// };
	// // @ts-ignore Todo
	// pageNoToScrollPosX = async (pageSize: ScaledSize, pageNo: number) => {
	//
	// };
	// // @ts-ignore Todo
	// pageNoToScrollPosY = async (pageSize: ScaledSize, pageNo: number) => {
	//
	// };
	//
}

function MiniViewerApp(props: { pdfPath: string; isDarkTheme: boolean; pageHeight: number }) {
	const [pdf, setPdf] = useState<PdfData>(null);
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const containerEl = useRef(null);
	useEffect(() => {
		const load = async () => {
			const pdfData = new PdfData();
			await pdfData.loadDoc(props.pdfPath);
			const scaledSize = await pdfData.getScaledSize(props.pageHeight, null);
			setPdf(pdfData);
			setScaledSize(scaledSize);
		};
		load()
			.catch(console.error);
	}, []);
	if (!pdf) return <div className="mini-app">Loading Pages..</div>;
	return (
		<div className="mini-app">
			<div className="app-pages" ref={containerEl}>
				{Array.from(Array(pdf.pageCount).keys()).map((i: number) => {
					return <Page pdf={pdf} pageNo={i + 1} isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={containerEl} key={i} />;
				}
				)}
			</div>
			<div className='app-bottom-bar'>
				<div className='page-info'>
					{pdf.pageCount} pages
				</div>
			</div>
		</div>
	);
}

const url = window.location.href.split('?resPath=')[1];
const appearance = window.frameElement.getAttribute('appearance');

document.documentElement.setAttribute('data-theme', appearance);

render(
	<MiniViewerApp pdfPath={url} isDarkTheme={appearance == 'dark'} pageHeight={400} />,
	document.getElementById('pdf-root')
);
