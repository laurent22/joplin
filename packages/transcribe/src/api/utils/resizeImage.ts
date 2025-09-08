import { remove, copy } from 'fs-extra';
import * as sharp from 'sharp';

const resizeImage = async (inputPath: string, outputPath: string, imageMaxDimension: number) => {

	const metadata = await sharp(inputPath).metadata();

	if (!metadata || metadata.width === undefined || metadata.height === undefined) {
		await copy(inputPath, outputPath);
		await remove(inputPath);
		return;
	}

	if (Math.max(metadata?.width, metadata?.height) <= imageMaxDimension) {
		await copy(inputPath, outputPath);
		await remove(inputPath);
		return;
	}

	await sharp(inputPath)
		.resize(imageMaxDimension, imageMaxDimension, { fit: 'inside', withoutEnlargement: true })
		.toFile(outputPath);

	await remove(inputPath);
};

export default resizeImage;
