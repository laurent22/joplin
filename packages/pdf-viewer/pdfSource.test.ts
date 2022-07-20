import { PdfData } from './pdfSource';
const path = require('path');
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.entry');

const pdfFilePath = path.resolve('config/welcome.pdf');

describe('pdfData', () => {
	const file = new Uint8Array(fs.readFileSync(pdfFilePath));
	test('Should have correct page count', async () => {
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
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		const size = await pdf.getPageSize();
		expect(size.height).toBeCloseTo(841.91998);
		expect(size.width).toBeCloseTo(594.95996);
	});

	test('Should calculate scaled size', async () => {
		const pdf = new PdfData();
		await pdf.loadDoc(file);
		const scaledSize = await pdf.getScaledSize(null, 200);
		expect(scaledSize.scale).toBeCloseTo(0.336157);
	});

});
