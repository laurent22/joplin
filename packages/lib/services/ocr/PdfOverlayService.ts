import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';
import CommandService from '../CommandService';
import { RecognizeResultLine } from './utils/types';

export default class PdfOverlayService {
	private pdfExtractDir_: string = null;

	private async pdfExtractDir(): Promise<string> {
		if (this.pdfExtractDir_ !== null) return this.pdfExtractDir_;
		const p = `${Setting.value('tempDir')}/pdf_overlay`;
		await shim.fsDriver().mkdir(p);
		this.pdfExtractDir_ = p;
		return this.pdfExtractDir_;
	}

	public async createSearchablePdf(resourceId: string) {
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
			throw new Error('Should have transcribed already, send file to OCR Queue');
		}

		const lines: RecognizeResultLine[][] = JSON.parse(resource.ocr_details);

		const resourceFilePath = Resource.fullPath(resource);

		const extractDir = await this.pdfExtractDir();
		const imageFilePaths = await shim.pdfToImages(resourceFilePath, extractDir);

		let htmlContent = await this.getBaseHtml();

		for (let page = 0; page < imageFilePaths.length; page++) {
			const currentImage = imageFilePaths[page];
			const currentLines = lines[page];
			htmlContent += await this.addNewPage(currentImage, currentLines);
			htmlContent += this.breakPrint();
		}

		htmlContent += '</body></html>';

		await shim.fsDriver().writeFile(`${extractDir}/output.html`, htmlContent, 'utf-8');

		return CommandService.instance().execute('exportHtmlAsPdf', `${extractDir}/output.html`);
	}

	private breakPrint() {
		return '';
	}

	private async addNewPage(currentImage: string, currentLine: RecognizeResultLine[]) {
		const imageDimensions = await shim.imageDimensions(currentImage);
		let b = `<div class="image-container">
            <img src="${currentImage}" class="image">
            <div class="text-overlay">
        `;

		for (const word of currentLine.flatMap(l => l.words)) {
			const bboxLeft = (word.bb[0] / imageDimensions.width) * 100;
			const bboxTop = (word.bb[2] / imageDimensions.height) * 100;
			b += `<div class="detected-text"
             data-type="text"
             style="left: ${bboxLeft}%; top: ${bboxTop}%;">${word.t}</div>
             `;
		}
		b += '</div></div>';
		return b;
	}

	private getBaseHtml() {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        background-color: #f5f5f5;
      }
      
      .image-container {
        position: relative;
        display: inline-block;
        overflow: hidden;
      }

      .image {
        width: 100%;
        height: 100%;
      }
      
      .text-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .detected-text {
        position: absolute;
        opacity: 0.01;
        color: rgba(0, 0, 0, 0.01);
        font-size: 8px;
        white-space: nowrap;
        z-index: 3;
      }
    </style>
</head>
<body>
    <div class="container">
`;
	}

}
