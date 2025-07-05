import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim, { ImageDimensions } from '../../shim';
import { RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from './utils/types';

const pdfExtractDir = async () => {
	const p = `${Setting.value('tempDir')}/pdf_overlay`;
	await shim.fsDriver().mkdir(p);
	return p;
};


const calculateWordPosition = (boundingBox: RecognizeResultBoundingBox, imageDimensions: ImageDimensions, text: string) => {
	const left = boundingBox[0];
	const top = boundingBox[2];
	const fontSize = boundingBox[3] - top;
	const width = boundingBox[1] - boundingBox[0];

	const canvas = new OffscreenCanvas(imageDimensions.width, imageDimensions.height);
	const ctx = canvas.getContext('2d');
	ctx.font = `${fontSize}px Arial`;
	const fontMeasures = ctx.measureText(text);
	const scale = {
		x: width / fontMeasures.width,
		y: fontSize / (fontMeasures.fontBoundingBoxAscent + fontMeasures.fontBoundingBoxDescent),
	};

	return {
		left,
		top,
		fontSize,
		scale,
	};

};

const generateTextOverlay = (allWords: RecognizeResultWord[], imageDimensions: ImageDimensions) => {
	return allWords.map(word => {
		const { left, top, fontSize, scale } = calculateWordPosition(word.bb, imageDimensions, word.t);
		return `<span 
			style="font-size: ${fontSize}px; 
			left: ${left.toFixed(2)}px; 
			top: ${top.toFixed(2)}px;
			transform: scale(${scale.x}, ${scale.y}); 
			">
		${word.t}</span>`;
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

	// Slightly decreasing the image to fit into the page
	const heightAdjusted = Math.round(imageDimensions.height - (imageDimensions.height * 0.005));

	return `<div class="image-container">
				<img style="width: ${imageDimensions.width}px; height: ${heightAdjusted}px;" src="${currentImage}">
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
			transform-origin: top left;
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
