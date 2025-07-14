import Resource from '../../../models/Resource';
import shim from '../../../shim';

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

	const resourceFilePath = Resource.fullPath(resource);

	const result = await shim.pdfInInches(resourceFilePath);
	return {
		width: result.width,
		height: result.height,
	};
}

export default getPageSize;
