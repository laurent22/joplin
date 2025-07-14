import Resource from '../../../models/Resource';
import shim from '../../../shim';

async function getPageSize(id: string) {
	const resource = await Resource.load(id, {
		fields: [
			'id',
			'mime',
			'file_extension',
		],
	});

	const resourceFilePath = Resource.fullPath(resource);
	const result = await shim.pdfInInches(resourceFilePath);

	return {
		width: result.width,
		height: result.height,
	};
}

export default getPageSize;
