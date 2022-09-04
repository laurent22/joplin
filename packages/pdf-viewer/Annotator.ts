import { MouseEvent } from 'react';
import { AnnotationFactory } from 'annotpdf/lib/annotation';
import PdfDocument from './PdfDocument';
import { ScaledSize } from './types';

export default class Annotator {
	private pdfDocument: PdfDocument = null;
	private currentPage: number = 1;
	private driver: AnnotationFactory = null;
	private hasChange = false;
	private clickPoint: {
		x: number;
		y: number;
	} = null;
	private selectionPoints: number[] = null;
	private selectedText: string = null;
	public constructor(pdfDocument: PdfDocument) {
		this.pdfDocument = pdfDocument;
	}
	public getDriver = async () => {
		if (this.driver) return this.driver;
		const pdfData = await this.pdfDocument.doc.getData();
		this.driver = new AnnotationFactory(pdfData);
		return this.driver;
	};

	private computePageOffset = (canvas: HTMLCanvasElement) => {
		const rect = canvas.getBoundingClientRect(), bodyElt = document.body;
		return {
			top: rect.top + bodyElt .scrollTop,
			left: rect.left + bodyElt .scrollLeft,
		};
	};

	private selectionCoordinates = async (scaledSize: ScaledSize, canvasElem: HTMLCanvasElement) => {
		const rects = window.getSelection().getRangeAt(0).getClientRects();
		const ost = this.computePageOffset(canvasElem);
		const points: number[] = [];
		const page = await this.pdfDocument.getPage(this.currentPage);
		const viewport = page.getViewport({ scale: scaledSize.scale || 1.0 });
		const processPoint = (x: number, y: number) => {
			const x_y = viewport.convertToPdfPoint(x, y);
			x = x_y[0];
			y = x_y[1];
			points.push(x, y);
		};
		for (let i = 0; i < rects.length; i++) {
			const rect = rects[i];
			const x_1 = rect.x - ost.left;
			const y_1 = rect.y - ost.top;
			const x_2 = x_1 + rect.width;
			const y_2 = y_1 + rect.height;
			processPoint(x_1, y_1);
			processPoint(x_2, y_1);
			processPoint(x_2, y_2);
			processPoint(x_1, y_2);
		}
		return points;
	};

	private getAnnotationAtPoint = async (pageNo: number, x: number, y: number): Promise<any> => {
		const driver = await this.getDriver();
		const annotations = await driver.getAnnotations();
		const pageAnnotations = annotations[pageNo - 1];
		if (!pageAnnotations) return null;
		return pageAnnotations.find((annotation) => {
			const points = annotation.rect;
			const x1 = points[0];
			const y1 = points[1];
			const x2 = points[2];
			const y2 = points[3];
			console.log('checking', x1, y1, x2, y2, 'pt:', x, y);
			console.log('annotation', annotation);
			if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
				console.log('found annotation', annotation);
				return true;
			}
			return false;
		});
	};

	public getAnnotationIdAtClick = async (): Promise<string> => {
		if (!this.clickPoint) return null;
		const { x, y } = this.clickPoint;
		const annotation = await this.getAnnotationAtPoint(this.currentPage, x, y);
		if (!annotation) return null;
		return annotation.id;
	};

	public hasTextSelection = (): boolean => {
		return (this.selectionPoints && this.selectionPoints.length && !!this.selectedText);
	};

	public processClick = async (pageNo: number, scaledSize: ScaledSize, canvasElem: HTMLCanvasElement, evt: MouseEvent) => {
		const text = window.getSelection().toString();
		const ost = this.computePageOffset(canvasElem);
		let x = evt.pageX - ost.left;
		let y = evt.pageY - ost.top;
		if (text) {
			const coords = await this.selectionCoordinates(scaledSize, canvasElem);
			this.selectionPoints = coords;
			this.selectedText = text;
		} else {
			this.selectionPoints = null;
			this.selectedText = null;
		}
		const page = await this.pdfDocument.getPage(this.currentPage);
		const viewport = page.getViewport({ scale: scaledSize.scale || 1.0 });
		const x_y = viewport.convertToPdfPoint(x, y);
		x = x_y[0];
		y = x_y[1];
		this.currentPage = pageNo;
		this.clickPoint = { x, y };
	};

	public deleteAnnotation = async (id: string) => {
		const driver = await this.getDriver();
		await driver.deleteAnnotation(id);
		await this.save();
	};

	public addHighlightAtClick = async () => {
		if (!this.hasTextSelection()) return;
		const driver = await this.getDriver();
		const obj = driver.createHighlightAnnotation({
			page: this.currentPage - 1,
			rect: [],
			quadPoints: this.selectionPoints,
			contents: this.selectedText,
			author: 'Joplin',
			color: { r: 255, g: 207, b: 0 },
			opacity: 0.4,
		});
		console.log(obj);
		console.log('annotation added');
		await this.save();
		// driver.download();
	};

	public save = async () => {
		console.log('save');
		this.hasChange = true;
		const driver = await this.getDriver();
		const annotatedBytes = driver.write();
		await this.pdfDocument.loadDoc(annotatedBytes);
	};

	public get hasChanges() {
		return this.hasChange;
	}
}
