import { remove } from 'fs-extra';
import env from '../../env';
const sharp = require('sharp');

const resizeImage = async (filePath: string) => {
	const envVariables = env();
	const maxDimension = envVariables.RESIZE_IMAGE_MAX_DIMENSION;

	const metadata = await sharp(filePath).metadata();

	if (!metadata) {
		return filePath;
	}

	const highestDimension = Math.max(metadata.width, metadata.height);

	if (highestDimension <= maxDimension) {
		return filePath;
	}

	const resizedFilePath = `${filePath}-resized.${metadata.format}`;

	await sharp(filePath)
		.resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
		.toFile(resizedFilePath);

	await remove(filePath);

	return resizedFilePath;
};

export default resizeImage;
