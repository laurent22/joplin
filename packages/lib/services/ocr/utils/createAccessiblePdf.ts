import { beginText, endText, PDFDocument, PDFHexString, PDFOperator, PDFPage, PDFRef, PDFString, setCharacterSqueeze, setFontAndSize, setTextMatrix, setTextRenderingMode, showText, TextRenderingMode } from 'pdf-lib';
import { PdfOcrDetails, RecognizeResultLine } from './types';
import glyphLessFontBase64 from './glyphLessFont';

// The PDF OCR images are created at 2x scale by pdfToImages()
const OCR_SCALE_FACTOR = 2;

// Metrics of the glyphless font, in 1/1000 of the font size
const GLYPH_WIDTH = 500;
const FONT_ASCENT = 800;
const FONT_DESCENT = -200;

export interface PageImageWithDimensions {
	buffer: Buffer;
	width: number;
	height: number;
}

// Maps code point to CID, for characters outside the BMP
type SupplementaryCids = Map<number, number>;

const surrogateStart = 0xD800;
const surrogateEnd = 0xDFFF;

const toUtf16Hex = (text: string) => {
	let output = '';
	for (let i = 0; i < text.length; i++) {
		output += text.charCodeAt(i).toString(16).padStart(4, '0');
	}
	return output;
};

// BMP characters use their code point as CID. Supplementary characters don't fit in a two-byte CID,
// so they are assigned CIDs in the surrogate range, which no valid character uses.
const textToCids = (text: string, supplementaryCids: SupplementaryCids) => {
	return Array.from(text).map(char => {
		const codePoint = char.codePointAt(0);
		if (codePoint >= surrogateStart && codePoint <= surrogateEnd) return 0xFFFD;
		if (codePoint <= 0xFFFF) return codePoint;

		let cid = supplementaryCids.get(codePoint);
		if (cid === undefined) {
			if (surrogateStart + supplementaryCids.size > surrogateEnd) return 0xFFFD;
			cid = surrogateStart + supplementaryCids.size;
			supplementaryCids.set(codePoint, cid);
		}
		return cid;
	});
};

// Maps each BMP CID to itself, and supplementary CIDs to their UTF-16 sequence. A bfrange may only
// vary in its last byte and a block may contain at most 100 entries.
const makeToUnicodeCMap = (supplementaryCids: SupplementaryCids) => {
	const ranges: string[] = [];
	for (let i = 0; i < 256; i++) {
		if (i >= surrogateStart >> 8 && i <= surrogateEnd >> 8) continue;
		const high = i.toString(16).toUpperCase().padStart(2, '0');
		ranges.push(`<${high}00> <${high}FF> <${high}00>`);
	}

	const chars: string[] = [];
	for (const [codePoint, cid] of supplementaryCids) {
		chars.push(`<${cid.toString(16).toUpperCase()}> <${toUtf16Hex(String.fromCodePoint(codePoint))}>`);
	}

	// cSpell:disable
	const blocks: string[] = [];
	for (let i = 0; i < ranges.length; i += 100) {
		const chunk = ranges.slice(i, i + 100);
		blocks.push(`${chunk.length} beginbfrange\n${chunk.join('\n')}\nendbfrange`);
	}
	for (let i = 0; i < chars.length; i += 100) {
		const chunk = chars.slice(i, i + 100);
		blocks.push(`${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar`);
	}

	return [
		'/CIDInit /ProcSet findresource begin',
		'12 dict begin',
		'begincmap',
		'/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
		'/CMapName /Adobe-Identity-UCS def',
		'/CMapType 2 def',
		'1 begincodespacerange',
		'<0000> <FFFF>',
		'endcodespacerange',
		...blocks,
		'endcmap',
		'CMapName currentdict /CMap defineresource pop',
		'end',
		'end',
	].join('\n');
	// cSpell:enable
};

// Standard fonts only support WinAnsi, so any other character (Cyrillic, CJK, etc.) would make
// pdf-lib throw. Instead, like Tesseract, we use a Type0 font whose CIDs are code points, all mapped
// to the same glyph, with a ToUnicode CMap so that the text can be extracted. The CMap depends on
// the supplementary characters in the document, so it's assigned once all the text has been added.
const embedGlyphLessFont = (pdfDoc: PDFDocument) => {
	const context = pdfDoc.context;

	const fontFile = Buffer.from(glyphLessFontBase64, 'base64');
	const fontFileRef = context.register(context.flateStream(fontFile, { Length1: fontFile.length }));

	// Two bytes per CID, all pointing to glyph 1
	const cidToGidMap = new Uint8Array(0x10000 * 2);
	for (let i = 1; i < cidToGidMap.length; i += 2) cidToGidMap[i] = 1;
	const cidToGidMapRef = context.register(context.flateStream(cidToGidMap));

	const fontDescriptorRef = context.register(context.obj({
		Type: 'FontDescriptor',
		FontName: 'GlyphLessFont',
		Flags: 5,
		FontBBox: [0, FONT_DESCENT, GLYPH_WIDTH, FONT_ASCENT],
		ItalicAngle: 0,
		Ascent: FONT_ASCENT,
		Descent: FONT_DESCENT,
		CapHeight: FONT_ASCENT,
		StemV: 80,
		FontFile2: fontFileRef,
	}));

	const cidFontRef = context.register(context.obj({
		Type: 'Font',
		Subtype: 'CIDFontType2',
		BaseFont: 'GlyphLessFont',
		CIDSystemInfo: {
			Registry: PDFString.of('Adobe'),
			Ordering: PDFString.of('Identity'),
			Supplement: 0,
		},
		FontDescriptor: fontDescriptorRef,
		CIDToGIDMap: cidToGidMapRef,
		DW: GLYPH_WIDTH,
	}));

	const toUnicodeRef = context.nextRef();

	const fontRef = context.register(context.obj({
		Type: 'Font',
		Subtype: 'Type0',
		BaseFont: 'GlyphLessFont',
		Encoding: 'Identity-H',
		DescendantFonts: [cidFontRef],
		ToUnicode: toUnicodeRef,
	}));

	return { fontRef, toUnicodeRef };
};

const rtlScriptRegex = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;
const isRtlLetter = (char: string) => rtlScriptRegex.test(char) && !/\p{N}/u.test(char);
const isLtrStrong = (char: string) => /[\p{L}\p{N}]/u.test(char) && !isRtlLetter(char);

// OCR text is in logical order, but viewers expect PDF text in visual (left-to-right) order and
// reorder it when extracting. So in right-to-left words, the runs are reversed, as well as the
// characters within right-to-left runs (numbers and Latin text remain left-to-right).
const toVisualOrder = (text: string) => {
	const chars = Array.from(text);
	if (!chars.some(isRtlLetter)) return text;

	// As in the Unicode bidi algorithm, combining marks take the direction of their base, and a
	// separator between two left-to-right characters (e.g. in "2024.05") is left-to-right too.
	const isLtr = chars.map(isLtrStrong);
	for (let i = 1; i < chars.length; i++) {
		if (/\p{M}/u.test(chars[i])) isLtr[i] = isLtr[i - 1];
	}
	for (let i = 1; i < chars.length - 1; i++) {
		if (!isRtlLetter(chars[i]) && isLtr[i - 1] && isLtr[i + 1]) isLtr[i] = true;
	}

	const runs: { ltr: boolean; chars: string[] }[] = [];
	for (let i = 0; i < chars.length; i++) {
		const lastRun = runs[runs.length - 1];
		if (lastRun && lastRun.ltr === isLtr[i]) {
			lastRun.chars.push(chars[i]);
		} else {
			runs.push({ ltr: isLtr[i], chars: [chars[i]] });
		}
	}

	return runs.reverse().map(run => run.ltr ? run.chars.join('') : run.chars.reverse().join('')).join('');
};

// Adds an invisible text layer to a PDF page based on OCR word positions.
// The text is rendered in "invisible" mode (render mode 3) so it doesn't
// appear visually but can be selected, copied, and read by screen readers.
const addInvisibleTextLayer = (
	page: PDFPage,
	lines: RecognizeResultLine[],
	fontRef: PDFRef,
	pageHeight: number,
	supplementaryCids: SupplementaryCids,
) => {
	const fontName = page.node.newFontDictionary('GlyphLessFont', fontRef);
	const operators: PDFOperator[] = [beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];

	for (const line of lines) {
		for (const word of line.words) {
			const text = word.t;
			if (!text || !text.trim()) continue;

			// Bounding box format from Tesseract: [x0, x1, y0, y1]
			const [x0, x1, y0, y1] = word.bb;

			// Convert from OCR coordinates (2x scale, origin top-left)
			// to PDF coordinates (1x scale, origin bottom-left)
			const wordWidth = (x1 - x0) / OCR_SCALE_FACTOR;
			const wordHeight = (y1 - y0) / OCR_SCALE_FACTOR;

			// The font's ascent-to-descent height is one em, so this makes the glyphs span the word's
			// bounding box, with the baseline placed above its bottom by the descent.
			const fontSize = Math.max(1, wordHeight);
			const pdfX = x0 / OCR_SCALE_FACTOR;
			const pdfY = pageHeight - (y1 / OCR_SCALE_FACTOR) - fontSize * FONT_DESCENT / 1000;

			// Stretch the text horizontally so that its selection matches the word on the image
			const cids = textToCids(toVisualOrder(text), supplementaryCids);
			const naturalWidth = cids.length * fontSize * GLYPH_WIDTH / 1000;
			const horizontalScale = wordWidth > 0 ? wordWidth / naturalWidth * 100 : 100;

			operators.push(
				setFontAndSize(fontName, fontSize),
				setCharacterSqueeze(horizontalScale),
				setTextMatrix(1, 0, 0, 1, pdfX, pdfY),
				showText(PDFHexString.of(cids.map(cid => cid.toString(16).padStart(4, '0')).join(''))),
			);
		}
	}

	operators.push(endText());
	page.pushOperators(...operators);
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

	const { fontRef, toUnicodeRef } = embedGlyphLessFont(pdfDoc);
	const supplementaryCids: SupplementaryCids = new Map();

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
		addInvisibleTextLayer(page, pageOcr.lines, fontRef, pageHeight, supplementaryCids);
	}

	pdfDoc.context.assign(toUnicodeRef, pdfDoc.context.flateStream(makeToUnicodeCMap(supplementaryCids)));

	return pdfDoc.save();
};

export default createAccessiblePdf;
