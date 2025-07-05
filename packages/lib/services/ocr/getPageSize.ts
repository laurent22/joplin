import Resource from '../../models/Resource';
import Setting from '../../models/Setting';
import shim from '../../shim';

interface PageSizeInInches {
	width: number;
	height: number;
}

type PageFormat = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'Legal' | 'Letter' | 'Tabloid' | 'Ledger' | 'custom';

export type PageSize = PageFormat | PageSizeInInches;

const pdfExtractDir = async () => {
	const p = `${Setting.value('tempDir')}/pdf_overlay`;
	await shim.fsDriver().mkdir(p);
	return p;
};

async function getPageSize(id: string) {
	const resource = await Resource.load(id, {
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

	const extractDir = await pdfExtractDir();
	const resourceFilePath = Resource.fullPath(resource);
	const imageFilePaths = await shim.pdfToImages(resourceFilePath, extractDir, { minPage: 1, maxPage: 1 });
	const imageDimensions = await shim.imageDimensions(imageFilePaths[0]);
	const aspectRatio = imageDimensions.height / imageDimensions.width;
	const tolerance = 0.05;

	const standardSizes = [
		{ name: 'A4', width: 8.27, height: 11.69, ratio: 11.69 / 8.27 },
		{ name: 'Letter', width: 8.5, height: 11, ratio: 11 / 8.5 },
		{ name: 'Legal', width: 8.5, height: 14, ratio: 14 / 8.5 },
		{ name: 'Tabloid', width: 11, height: 17, ratio: 17 / 11 },
		{ name: 'Ledger', width: 17, height: 11, ratio: 11 / 17 },
	];

	for (const size of standardSizes) {
		if (Math.abs(aspectRatio - size.ratio) <= tolerance) {
			return {
				detectedSize: size.name as PageSize,
			};
		}
	}

	// Fallback to 300 DPI assumption
	return {
		width: imageDimensions.width / 300,
		height: imageDimensions.height / 300,
		detectedSize: 'Custom' as PageSize,
	};
}

export default getPageSize;
