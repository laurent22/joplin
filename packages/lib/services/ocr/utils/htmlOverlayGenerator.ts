import { htmlentities } from '@joplin/utils/html';
import shim, { ImageDimensions } from '../../../shim';
import { RecognizeResultBoundingBox, RecognizeResultLine, RecognizeResultWord } from '../utils/types';

type PdfSizeInInches ={ width: number; height: number };

// This value was found by try and error
// For some reason the image taken from the PDF page won't fit a page from the same size
const slightlyDecreaseSize = (value: number) => {
	const n = 0.005;
	return value - (value * n);
};

const getRealSizeOfTextContent = (imageDimensions: ImageDimensions, textContent: string, fontSize: number) => {
	const canvas = new OffscreenCanvas(imageDimensions.width, imageDimensions.height);
	const ctx = canvas.getContext('2d');
	ctx.font = `${fontSize}px Arial`;
	return ctx.measureText(textContent);
};

const calculateWordPosition = (boundingBox: RecognizeResultBoundingBox, imageDimensions: ImageDimensions, textContent: string) => {
	const left = boundingBox[0];
	const top = boundingBox[2];
	const fontSize = boundingBox[3] - top;
	const width = boundingBox[1] - boundingBox[0];

	const fontMeasures = getRealSizeOfTextContent(imageDimensions, textContent, fontSize) ;

	const scale = {
		x: width / fontMeasures.width,
		y: fontSize / (fontMeasures.fontBoundingBoxAscent + fontMeasures.fontBoundingBoxDescent),
	};

	return {
		left,
		top: slightlyDecreaseSize(top),
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
		${htmlentities(word.t)}</span>`;
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

	const heightAdjusted = slightlyDecreaseSize(imageDimensions.height);

	return `<div class="image-container">
				<img style="width: ${imageDimensions.width}px; height: ${heightAdjusted}px;" src="${currentImage}">
				<div>
				${textOverlayHtml}
				</div>
			</div>
		`;
};


const wrapOnBaseHtml = (pagesHtml: string, pdfSizeInInches: PdfSizeInInches) => {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		@page {
			margin: 0;
			size: ${pdfSizeInInches.width.toFixed(2)}in ${pdfSizeInInches.height.toFixed(2)}in;
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
			overflow: hidden;
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


const htmlOverlayGenerator = async (imageFilePaths: string[], lines: RecognizeResultLine[][], pdfSizeInInches: PdfSizeInInches, extractDir: string) => {
	let htmlContent = '';
	for (let page = 0; page < imageFilePaths.length; page++) {
		const currentImage = imageFilePaths[page];
		const currentLines = lines[page];
		htmlContent += await addNewPage(currentImage, currentLines);
	}

	const htmlFileFromPdf = await shim.fsDriver().findUniqueFilename(`${extractDir}/output.html`);
	await shim.fsDriver().writeFile(htmlFileFromPdf, wrapOnBaseHtml(htmlContent, pdfSizeInInches), 'utf-8');

	return htmlFileFromPdf;
};

export default htmlOverlayGenerator;
