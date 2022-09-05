import * as pdfjsLib from 'pdfjs-dist';
import { ScaledSize } from './types';

export default class PdfDocument {
	public url: string | Uint8Array;
	private doc: any = null;
	public pageCount: number = null;
	private pages: any = {};
	private pageSize: {
		height: number;
		width: number;
	} = null;
	private document: HTMLDocument = null;

	public constructor(document: HTMLDocument) {
		this.document = document;
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
		return Math.min(pageNo, this.pageCount);
	};

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
			frame.focus();
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
