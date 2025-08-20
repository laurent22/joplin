import { remove } from 'fs-extra';
import * as sharp from 'sharp';

const resizeImage = async (filePath: string, imageMaxDimension: number) => {

	const metadata = await sharp(filePath).metadata();

	if (!metadata || metadata.width === undefined || metadata.height === undefined) {
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
