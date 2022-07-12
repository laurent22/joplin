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

function Page(props: { pdf: PdfData; pageNo: number; focusOnLoad: boolean; isAnchored: boolean; scaledSize: ScaledSize; isDarkTheme: boolean; container: any }) {
	const [error, setError] = useState(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const canvasEl = useRef<HTMLCanvasElement>(null);
	const wrapperEl = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(canvasEl, props.container);

	useEffect(() => {
		const loader = async () => {
			if (isLoaded || !isVisible || !props.pdf || !props.scaledSize) return;
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

				// console.log('page loaded:', props.pageNo);
				setIsLoaded(true);
			} catch (err) {
				console.log('Error loading page no.', props.pageNo, err);
				setError(err);
			}
		};
		loader()
			.catch(console.error);
	}, [props.pageNo, props.scaledSize, props.pdf, isVisible]);

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
}

function MiniViewerApp(props: { pdfPath: string; isDarkTheme: boolean; pageWidth: number; anchorPage: number }) {
	const [pdf, setPdf] = useState<PdfData>(null);
	const [scaledSize, setScaledSize] = useState<ScaledSize>(null);
	const [isFocused, setIsFocused] = useState(false);
	const containerEl = useRef(null);
	const innerContainerEl = useRef(null);
	useEffect(() => {
		const load = async () => {
			const pdfData = new PdfData();
			await pdfData.loadDoc(props.pdfPath);
			const scaledSize = await pdfData.getScaledSize(null, props.pageWidth);
			setPdf(pdfData);
			setScaledSize(scaledSize);
		};
		load()
			.catch(console.error);
		window.addEventListener('message', (event: any) => {
			if (event.data.type === 'blur') {
				setIsFocused(false);
			}
		});
		document.addEventListener('click', (_) => {
			setIsFocused(true);
		});
	}, []);
	if (!pdf) return <div className="mini-app">Loading Pages..</div>;
	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<div className='pages-holder' ref={innerContainerEl} >
					{Array.from(Array(pdf.pageCount).keys()).map((i: number) => {
						return <Page pdf={pdf} pageNo={i + 1} focusOnLoad={props.anchorPage && props.anchorPage == i + 1}
							isAnchored={props.anchorPage && props.anchorPage == i + 1}
							isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={containerEl} key={i} />;
					}
					)}
				</div>
			</div>
			<div className='app-bottom-bar'>
				<div className='page-info'>
					{pdf.pageCount} pages
				</div>
				<div>{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}

const url = window.frameElement.getAttribute('url');
const appearance = window.frameElement.getAttribute('appearance');
const anchorPage = window.frameElement.getAttribute('anchorPage');

document.documentElement.setAttribute('data-theme', appearance);

render(
	<MiniViewerApp pdfPath={url} isDarkTheme={appearance == 'dark'} anchorPage={anchorPage ? Number(anchorPage) : null} pageWidth={400} />,
	document.getElementById('pdf-root')
);
