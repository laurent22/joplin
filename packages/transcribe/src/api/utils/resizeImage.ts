import { remove } from 'fs-extra';
const sharp = require('sharp');

const resizeImage = async (filePath: string, imageMaxDimension: number) => {

	const metadata = await sharp(filePath).metadata();

	if (!metadata) {
		return filePath;
	}

	const highestDimension = Math.max(metadata.width, metadata.height);

	if (highestDimension <= imageMaxDimension) {
		return filePath;
	}

	const resizedFilePath = `${filePath}-resized.${metadata.format}`;

	await sharp(filePath)
		.resize(imageMaxDimension, imageMaxDimension, { fit: 'inside', withoutEnlargement: true })
		.toFile(resizedFilePath);

	await remove(filePath);

	return resizedFilePath;
};

export default resizeImage;
