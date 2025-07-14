import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';
import htmlOverlayGenerator from './utils/htmlOverlayGenerator';
import { RecognizeResultLine } from './utils/types';

const pdfExtractDir = async () => {
	const p = `${Setting.value('tempDir')}/pdf_overlay`;
	await shim.fsDriver().mkdir(p);
	return p;
};

const groupLinesByPage = (lines: RecognizeResultLine[]) => {
	const pages = [];
	let currentPage = 0;
	let startPageAt = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].page !== currentPage) {
			currentPage = lines[i].page;
			pages.push(lines.slice(startPageAt, i));
			startPageAt = i;
		}

		if (i === lines.length - 1) {
			pages.push(lines.slice(startPageAt, lines.length));
		}
	}
	return pages;
};

const createHtmlWithTranscriptionFromPdf = async (resourceId: string) => {
	const resource = await Resource.load(resourceId, {
		fields: [
			'id',
			'mime',
			'file_extension',
			'encryption_applied',
			'ocr_details',
		],
	});

	if (!resource.ocr_details) {
		throw new Error('Should have been transcribed already, send file to OCR Queue');
	}

	const lines: RecognizeResultLine[] = JSON.parse(resource.ocr_details);

	const extractDir = await pdfExtractDir();
	const resourceFilePath = Resource.fullPath(resource);
	const imageFilePaths = await shim.pdfToImages(resourceFilePath, extractDir);

	const linesPerPage = groupLinesByPage(lines);
	const pdfSizeInInches = await shim.pdfInInches(resourceFilePath);
	return htmlOverlayGenerator(imageFilePaths, linesPerPage, pdfSizeInInches, extractDir);
};

export default createHtmlWithTranscriptionFromPdf;
