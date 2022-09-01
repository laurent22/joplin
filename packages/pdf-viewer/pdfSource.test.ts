import { PdfData } from './pdfSource';
import * as pdfjsLib from 'pdfjs-dist';
import { readFile } from 'fs';
import { resolve } from 'path';

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.entry');

const pdfFilePath1 = resolve('config/welcome.pdf');


function loadFile(filePath: string) {
	return new Promise<Uint8Array>((resolve, reject) => {
		readFile(filePath, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(new Uint8Array((data)));
			}
		});
	});
}

describe('pdfData', () => {

	test('Should have correct page count', async () => {
		const file = await loadFile(pdfFilePath1);
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		expect(pdf.pageCount).toBe(1);
	});

	test('Should throw error on invalid file', async () => {
		const pdf = new PdfData();
		await expect(async () => {
			await pdf.loadDoc('');
		}).rejects.toThrowError();
	});

	test('Should get correct page size', async () => {
		const file = await loadFile(pdfFilePath1);
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		const size = await pdf.getPageSize();
		expect(size.height).toBeCloseTo(841.91998);
		expect(size.width).toBeCloseTo(594.95996);
	});

	test('Should calculate scaled size', async () => {
		const file = await loadFile(pdfFilePath1);
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		const scaledSize = await pdf.getScaledSize(null, 200);
		expect(scaledSize.scale).toBeCloseTo(0.336157);
	});

	test('Should get correct active page', async () => {
		const file = await loadFile(pdfFilePath1);
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		const scaledSize = await pdf.getScaledSize(null, 200);
		const activePage = pdf.getActivePageNo(scaledSize, 3, 0);
		expect(activePage).toBe(1);
		const activePage2 = pdf.getActivePageNo(scaledSize, 4, 8000);
		expect(activePage2).toBe(1);
	});

});
