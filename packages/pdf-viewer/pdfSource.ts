import * as pdfjsLib from 'pdfjs-dist';
import { MutableRefObject } from 'react';

export interface ScaledSize {
	height: number;
	width: number;
	scale: number;
}

interface RenderingTask {
	resolve: ()=> void;
	reject: (error: any)=> void;
	pageNo: number;
	canvas: MutableRefObject<HTMLCanvasElement>;
	textLayer: MutableRefObject<HTMLElement>;
	scaledSize: ScaledSize;
	isCancelled: ()=> boolean;
}

export class PdfData {
	public url: string | Uint8Array;
	private doc: any = null;
	public pageCount: number = null;
	private pages: any = {};
	private renderingQueue: {tasks: RenderingTask[]; lock: boolean};
	private pageSize: {
		height: number;
		width: number;
	} = null;

	public constructor() {
		this.renderingQueue = { tasks: [], lock: false };
	}

	public loadDoc = async (url: string | Uint8Array) => {
		this.url = url;
		const loadingTask = pdfjsLib.getDocument(url);
		try {
			const pdfDocument: any = await loadingTask.promise;
			this.doc = pdfDocument;
			this.pageCount = pdfDocument.numPages;
		} catch (error) {
			error.message = `Could not load document: ${error.message}`;
			throw error;
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

	public getActivePageNo = (scaledSize: ScaledSize, pageGap: number, scrollTop: number): number => {
		const pageHeight = scaledSize.height + pageGap;
		const pageNo = Math.floor(scrollTop / pageHeight) + 1;
		return pageNo;
	};

	private renderPageImpl = async (pageNo: number, canvas: MutableRefObject<HTMLCanvasElement>, textLayer: MutableRefObject<HTMLElement>, scaledSize: ScaledSize, isCancelled: ()=> boolean) => {
		const page = await this.getPage(pageNo);
		if (isCancelled()) return;

		const viewport = page.getViewport({ scale: scaledSize.scale || 1.0 });
		canvas.current.width = viewport.width;
		canvas.current.height = viewport.height;
		const ctx = canvas.current.getContext('2d');
		if (!ctx) {
			throw new Error('Could not get canvas context');
		}

		await page.render({
			canvasContext: ctx,
			viewport,
		}).promise;
		if (isCancelled()) return;

		if (textLayer) {
			const txtContext = await page.getTextContent();
			if (isCancelled()) return;
			// Pass the data to the method for rendering of text over the pdf canvas.
			textLayer.current.style.height = `${canvas.current.clientHeight}px`;
			textLayer.current.style.width = `${canvas.current.clientWidth}px`;
			textLayer.current.innerHTML = '';
			pdfjsLib.renderTextLayer({
				textContent: txtContext,
				enhanceTextSelection: true,
				// @ts-ignore
				container: textLayer.current,
				viewport: viewport,
				textDivs: [],
			});
		}
	};

	public renderPage(pageNo: number, scaledSize: ScaledSize, canvas: MutableRefObject<HTMLCanvasElement>, textLayer: MutableRefObject<HTMLElement>, isCancelled: ()=> boolean): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.renderingQueue.lock) {
				// console.warn('Adding to task, page:', pageNo, 'prev queue size:', this.renderingQueue.tasks.length);
				this.renderingQueue.tasks.push({
					resolve,
					reject,
					pageNo,
					canvas,
					textLayer,
					scaledSize,
					isCancelled,
				});
			} else {
				this.renderingQueue.lock = true;
				const next = () => {
					this.renderingQueue.lock = false;
					if (this.renderingQueue.tasks.length > 0) {
						const task = this.renderingQueue.tasks.shift();
						// console.log('executing next task of page:', pageNo, 'remaining tasks:', this.renderingQueue.tasks.length);
						void this.renderPage(task.pageNo, task.scaledSize, task.canvas, task.textLayer, task.isCancelled);
					}
				};
				// console.log('rendering page:', pageNo, 'scaledSize:', scaledSize);
				this.renderPageImpl(pageNo, canvas, textLayer, scaledSize, isCancelled).then(resolve).catch(reject).finally(next);
			}
		});
	}
}
