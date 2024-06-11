import * as pdfjsLib from 'pdfjs-dist';
import { ScaledSize, RenderRequest, RenderResult } from './types';
import { Mutex, MutexInterface, withTimeout } from 'async-mutex';


export default class PdfDocument {
	public url: string | Uint8Array;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private doc: any = null;
	public pageCount: number = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private pages: any = {};
	private rendererMutex: MutexInterface = null;
	private pageSize: {
		height: number;
		width: number;
	} = null;
	private document: HTMLDocument = null;

	public constructor(document: HTMLDocument) {
		this.document = document;
		this.rendererMutex = withTimeout(new Mutex(), 40 * 1000);
	}

	public loadDoc = async (url: string) => {
		this.url = url;
		const loadingTask = pdfjsLib.getDocument({ url, isEvalSupported: false });
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		return Math.min(pageNo, this.pageCount);
	};

	private renderPageImpl = async ({ pageNo, scaledSize, getTextLayer, isCancelled }: RenderRequest): Promise<RenderResult> => {

		const checkCancelled = () => {
			if (isCancelled()) {
				throw new Error(`Render cancelled, page: ${pageNo}`);
			}
		};

		const page = await this.getPage(pageNo);
		checkCancelled();

		const canvas = this.document.createElement('canvas');
		canvas.classList.add('page-canvas');
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
		if (getTextLayer) {
			textLayerDiv = this.document.createElement('div');
			textLayerDiv.classList.add('textLayer');
			const textFragment = this.document.createDocumentFragment();
			const txtContext = await page.getTextContent();
			checkCancelled();
			// Pass the data to the method for rendering of text over the pdf canvas.
			textLayerDiv.style.height = `${viewport.height}px`;
			textLayerDiv.style.width = `${viewport.width}px`;
			await pdfjsLib.renderTextLayer({
				textContent: txtContext,
				container: textFragment,
				viewport: viewport,
				textDivs: [],
			}).promise;
			textLayerDiv.appendChild(textFragment);
		}

		return { canvas, textLayerDiv };
	};

	public async renderPage(task: RenderRequest): Promise<RenderResult> {
		// We're using a render mutex to avoid rendering too many pages at the same time
		// Which can cause the pdfjs library to abandon some of the in-progress rendering unexpectedly
		return await this.rendererMutex.runExclusive(async () => {
			return await this.renderPageImpl(task);
		});
	}

	public printPdf = () => {
		const frame = this.document.createElement('iframe');
		frame.style.position = 'fixed';
		frame.style.display = 'none';
		frame.style.height = '100%';
		frame.style.width = '100%';
		this.document.body.appendChild(frame);
		frame.onload = () => {
			frame.contentWindow.onafterprint = () => {
				frame.remove();
			};
			console.warn('frame.focus() has been disabled!! Use focusHandler instead');
			// frame.focus();
			frame.contentWindow.print();
		};
		frame.src = this.url as string;
	};

	public downloadPdf = async () => {
		const url = this.url as string;
		const link = this.document.createElement('a');
		link.href = url;
		link.download = url;
		link.click();
		link.remove();
	};
}
