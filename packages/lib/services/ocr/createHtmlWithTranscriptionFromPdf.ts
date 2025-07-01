import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim, { ImageDimensions } from '../../shim';
import { RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from './utils/types';

const pdfExtractDir = async () => {
	const p = `${Setting.value('tempDir')}/pdf_overlay`;
	await shim.fsDriver().mkdir(p);
	return p;
};


const calculateWordPosition = (boundingBox: RecognizeResultBoundingBox, imageDimensions: ImageDimensions) => {
	const left = boundingBox[0];
	const top = boundingBox[2];
	const height = boundingBox[3] - top;
	const a4height = 1134;
	return {
		left: (left / imageDimensions.width) * 100,
		top: (top / imageDimensions.height) * 100,
		fontSize: (height / imageDimensions.height) * a4height,
		boundingBox,
	};

};

const generateTextOverlay = (allWords: RecognizeResultWord[], imageDimensions: ImageDimensions) => {
	return allWords.map(word => {
		const { left, top, fontSize } = calculateWordPosition(word.bb, imageDimensions);
		return `<span style="font-size: ${fontSize}px; left: ${left.toFixed(2)}%; top: ${top.toFixed(2)}%;">${word.t}</span>`;
	}).join('\n');
};

const addNewPage = async (currentImage: string, currentLine: RecognizeResultLine[]) => {
	if (currentLine.length === 0) {
		return `<div class="image-container">
				<img src="${currentImage}" class="image">
			</div>`;
	}

	const imageDimensions = await shim.imageDimensions(currentImage);

	const allWords = currentLine.flatMap(l => l.words);
	const textOverlayHtml = generateTextOverlay(allWords, imageDimensions);

	return `<div class="image-container">
				<img src="${currentImage}">
				<div>
				${textOverlayHtml}
				</div>
			</div>
		`;
};

const wrapOnBaseHtml = (pagesHtml: string) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		@page {
			margin: 0;
		}

		body {
			font-family: Arial, sans-serif;
			margin: 0;
			background-color: #f5f5f5;
		}
	  
		.image-container {
			position: relative;
		}

		.image-container img {
			/* This is required so the image doesn't take more than one page. */
			/* We need to check if 5px is a good value even for larger images. */
			width: calc(100% - 5px); 
			height: calc(100% - 5px); 
		  }

		.image-container div {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%; 
		}

		.image-container div span {
			position: absolute;
			opacity: 0.01;
			color: rgba(0, 0, 0, 0.01);
			font-size: 8px;
		}
	</style>
</head>
<body>
	<div class="container">
	${pagesHtml}
	</div>
</body>
</html>
`;
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

	const lines: RecognizeResultLine[][] = JSON.parse(resource.ocr_details);

	const extractDir = await pdfExtractDir();
	const resourceFilePath = Resource.fullPath(resource);
	const imageFilePaths = await shim.pdfToImages(resourceFilePath, extractDir);

	if (lines.length !== imageFilePaths.length) {
		throw new Error(`Mismatch number of transcribed pages and images generated from PDF. Images: ${imageFilePaths.length}. Pages: ${lines.length}`);
	}

	let htmlContent = '';
	for (let page = 0; page < imageFilePaths.length; page++) {
		const currentImage = imageFilePaths[page];
		const currentLines = lines[page];
		htmlContent += await addNewPage(currentImage, currentLines);
	}

	const htmlFileFromPdf = await shim.fsDriver().findUniqueFilename(`${extractDir}/output.html`);
	await shim.fsDriver().writeFile(htmlFileFromPdf, wrapOnBaseHtml(htmlContent), 'utf-8');

	return htmlFileFromPdf;
};

export default createHtmlWithTranscriptionFromPdf;
