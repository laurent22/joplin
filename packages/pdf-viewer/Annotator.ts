import { MouseEvent } from 'react';
import { AnnotationFactory } from 'annotpdf/lib/annotation';
import PdfDocument from './PdfDocument';
import { ScaledSize, MarkupTool, MarkupColor } from './types';

export default class Annotator {
	private pdfDocument: PdfDocument = null;
	private driver: AnnotationFactory = null;
	private hasChange = false;
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

	private selectionCoordinates = async (pageNo: number, scaledSize: ScaledSize, canvasElem: HTMLCanvasElement) => {
		const rects = window.getSelection().getRangeAt(0).getClientRects();
		const ost = this.computePageOffset(canvasElem);
		const points: number[] = [];
		const page = await this.pdfDocument.getPage(pageNo);
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
				return annotation;
			}
			return null;
		});
	};

	public deleteAnnotationAtClick = async (pageNo: number, scaledSize: ScaledSize, canvasElem: HTMLCanvasElement, evt: MouseEvent): Promise<boolean> => {
		const ost = this.computePageOffset(canvasElem);
		let x = evt.pageX - ost.left;
		let y = evt.pageY - ost.top;
		const page = await this.pdfDocument.getPage(pageNo);
		const viewport = page.getViewport({ scale: scaledSize.scale || 1.0 });
		const x_y = viewport.convertToPdfPoint(x, y);
		x = x_y[0];
		y = x_y[1];
		if (!x || !y) return false;
		const annotation = await this.getAnnotationAtPoint(pageNo, x, y);
		if (!annotation) return false;
		await this.deleteAnnotation(annotation.id || annotation.object_id);
		return true;
	};

	public deleteAnnotation = async (id: string | any) => {
		console.log('deleting annotation', id);
		const driver = await this.getDriver();
		console.log('driver', driver);
		await driver.deleteAnnotation(id);
		console.log('deleted annotation', id);
		await this.save();
	};

	private getColor = (color: MarkupColor) => {
		switch (MarkupColor[color]) {
		case MarkupColor.Red:
			return [1, 0, 0];
		case MarkupColor.Green:
			return [0, 1, 0];
		case MarkupColor.Blue:
			return [0, 0, 1];
		case MarkupColor.Yellow:
			return [1, 1, 0];
		case MarkupColor.Purple:
			return [1, 0, 1];
		default:{
			console.error('Unknown color', color);
			return [0, 0, 0];
		}
		}
	};

	public addTextAnnotation = async (tool: MarkupTool, color: MarkupColor, pageNo: number, scaledSize: ScaledSize, canvasElem: HTMLCanvasElement) => {
		const text = window.getSelection().toString();
		if (!text) return;
		const coords = await this.selectionCoordinates(pageNo, scaledSize, canvasElem);
		const driver = await this.getDriver();
		const colorArray = this.getColor(color);
		const options: any = {
			page: pageNo - 1,
			rect: [],
			quadPoints: coords,
			contents: text,
			author: 'Joplin',
			color: { r: colorArray[0], g: colorArray[1], b: colorArray[2] },
			opacity: 0.6,
		};
		if (tool === MarkupTool.Highlight) {
			driver.createHighlightAnnotation(options);
		} else if (tool === MarkupTool.Underline) {
			driver.createUnderlineAnnotation(options);
		} else if (tool === MarkupTool.StrikeThrough) {
			driver.createStrikeOutAnnotation(options);
		} else {
			throw new Error(`Invalid text tool: ${tool}`);
		}
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
