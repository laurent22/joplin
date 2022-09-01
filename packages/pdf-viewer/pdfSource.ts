import * as pdfjsLib from 'pdfjs-dist';

export interface ScaledSize {
	height: number;
	width: number;
	scale: number;
}

interface RenderingTask {
	resolve: (result: [canvas: HTMLCanvasElement, textLayer: HTMLDivElement])=> void;
	reject: (error: any)=> void;
	pageNo: number;
	scaledSize: ScaledSize;
	textLayer: boolean;
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

	private renderPageImpl = async (pageNo: number, scaledSize: ScaledSize, textLayer: boolean, isCancelled: ()=> boolean): Promise<[HTMLCanvasElement, HTMLDivElement]> => {

		const checkCancelled = () => {
			if (isCancelled()) {
				throw new Error(`Render cancelled, page: ${pageNo}`);
			}
		};

		const page = await this.getPage(pageNo);
		checkCancelled();

		const canvas = document.createElement('canvas');
		const viewport = page.getViewport({ scale: scaledSize.scale || 1.0 });
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Could not get canvas context');
		}

		await page.render({
			canvasContext: ctx,
			viewport,
		}).promise;
		checkCancelled();

		let textLayerDiv = null;
		if (textLayer) {
			textLayerDiv = document.createElement('div');
			textLayerDiv.classList.add('textLayer');
			const txtContext = await page.getTextContent();
			checkCancelled();
			// Pass the data to the method for rendering of text over the pdf canvas.
			textLayerDiv.style.height = `${viewport.height}px`;
			textLayerDiv.style.width = `${viewport.width}px`;
			textLayerDiv.innerHTML = '';
			pdfjsLib.renderTextLayer({
				textContent: txtContext,
				enhanceTextSelection: true,
				// @ts-ignore
				container: textLayerDiv,
				viewport: viewport,
				textDivs: [],
			});
		}

		canvas.style.height = '100%';
		canvas.style.width = '100%';

		return [canvas, textLayerDiv];
	};

	public renderPage(pageNo: number, scaledSize: ScaledSize, textLayer: boolean, isCancelled: ()=> boolean): Promise<[HTMLCanvasElement, HTMLDivElement]> {
		return new Promise<[HTMLCanvasElement, HTMLDivElement]>((resolve, reject) => {
			if (this.renderingQueue.lock) {
				// console.warn('Adding to task, page:', pageNo, 'prev queue size:', this.renderingQueue.tasks.length);
				this.renderingQueue.tasks.push({
					resolve,
					reject,
					pageNo,
					scaledSize,
					textLayer,
					isCancelled,
				});
			} else {
				this.renderingQueue.lock = true;
				const next = () => {
					this.renderingQueue.lock = false;
					if (this.renderingQueue.tasks.length > 0) {
						const task = this.renderingQueue.tasks.shift();
						// console.log('executing next task of page:', task.pageNo, 'remaining tasks:', this.renderingQueue.tasks.length);
						this.renderPage(task.pageNo, task.scaledSize, task.textLayer, task.isCancelled).then(task.resolve).catch(task.reject);
					}
				};
				// console.log('rendering page:', pageNo, 'scaledSize:', scaledSize);
				this.renderPageImpl(pageNo, scaledSize, textLayer, isCancelled).then(resolve).catch(reject).finally(next);
			}
		});
	}
}
