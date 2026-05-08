import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { PdfOcrDetails, RecognizeResultLine } from './types';

// The PDF OCR images are created at 2x scale by pdfToImages()
const OCR_SCALE_FACTOR = 2;

export interface PageImageWithDimensions {
	buffer: Buffer;
	width: number;
	height: number;
}

// Adds an invisible text layer to a PDF page based on OCR word positions.
// The text is rendered in "invisible" mode (render mode 3) so it doesn't
// appear visually but can be selected, copied, and read by screen readers.
const addInvisibleTextLayer = (
	page: PDFPage,
	lines: RecognizeResultLine[],
	font: PDFFont,
	_pageWidth: number,
	pageHeight: number,
): void => {
	for (const line of lines) {
		for (const word of line.words) {
			const text = word.t;
			if (!text || !text.trim()) continue;

			// Bounding box format from Tesseract: [x0, x1, y0, y1]
			const [x0, , y0, y1] = word.bb;

			// Convert from OCR coordinates (2x scale, origin top-left)
			// to PDF coordinates (1x scale, origin bottom-left)
			const pdfX = x0 / OCR_SCALE_FACTOR;
			const pdfY = pageHeight - (y1 / OCR_SCALE_FACTOR); // Flip Y axis and use bottom of bbox

			// Calculate word height in PDF coordinates (width not currently used)
			const wordHeight = (y1 - y0) / OCR_SCALE_FACTOR;

			// Estimate font size based on word height
			// We want the text to fit within the bounding box
			const fontSize = Math.max(1, wordHeight * 0.85);

			// Draw the text as invisible (using transparent color)
			// PDF.js and screen readers can still detect and read this text
			page.drawText(text, {
				x: pdfX,
				y: pdfY,
				size: fontSize,
				font: font,
				color: rgb(0, 0, 0),
				opacity: 0, // Make text invisible
				// Note: pdf-lib doesn't directly support render mode 3 (invisible),
				// but opacity: 0 achieves the same visual effect while keeping
				// the text selectable
			});
		}
	}
};

// Creates an accessible PDF by overlaying invisible text on top of page images.
// The text positions are derived from OCR bounding boxes, allowing the PDF to be
// searched and read by screen readers while maintaining the visual appearance.
// Page dimensions are provided separately (from pdfToImagesWithDimensions) rather
// than stored in OCR details, to keep storage size smaller.
const createAccessiblePdf = async (
	pageImages: PageImageWithDimensions[],
	ocrDetailsJson: string,
): Promise<Uint8Array> => {
	const ocrDetails: PdfOcrDetails = JSON.parse(ocrDetailsJson);

	if (ocrDetails.version !== 1) {
		throw new Error(`Unsupported PDF OCR details version: ${ocrDetails.version}`);
	}

	if (pageImages.length !== ocrDetails.pages.length) {
		throw new Error(`Page count mismatch: ${pageImages.length} images vs ${ocrDetails.pages.length} OCR pages`);
	}

	const pdfDoc = await PDFDocument.create();

	// Embed a standard font for the invisible text layer
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

	for (let pageIndex = 0; pageIndex < pageImages.length; pageIndex++) {
		const pageImage = pageImages[pageIndex];
		const pageOcr = ocrDetails.pages[pageIndex];

		// Embed the page image
		const image = await pdfDoc.embedJpg(pageImage.buffer);

		// Calculate page dimensions from image dimensions (scaled down from 2x)
		const pageWidth = pageImage.width / OCR_SCALE_FACTOR;
		const pageHeight = pageImage.height / OCR_SCALE_FACTOR;

		// Add a page with the calculated dimensions
		const page = pdfDoc.addPage([pageWidth, pageHeight]);

		// Draw the image as the background, filling the entire page
		page.drawImage(image, {
			x: 0,
			y: 0,
			width: pageWidth,
			height: pageHeight,
		});

		// Add invisible text layer on top
		addInvisibleTextLayer(page, pageOcr.lines, font, pageWidth, pageHeight);
	}

	return pdfDoc.save();
};

export default createAccessiblePdf;
