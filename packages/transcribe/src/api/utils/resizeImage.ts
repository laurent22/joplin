import { remove } from 'fs-extra';
const sharp = require('sharp');

const resizeImage = async (filePath: string) => {
	const maxSize = 400;

	const metadata = await sharp(filePath).metadata();

	if (!metadata) {
		return filePath;
	}

	const highestDimension = Math.max(metadata.width, metadata.height);

	if (highestDimension <= maxSize) {
		return filePath;
	}

	const resizedFilePath = `${filePath}-resized.${metadata.format}`;

	await sharp(filePath)
		.resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
		.toFile(resizedFilePath);

	await remove(filePath);

	return resizedFilePath;
};

export default resizeImage;
