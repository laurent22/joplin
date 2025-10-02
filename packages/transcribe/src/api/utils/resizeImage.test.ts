import { copy, exists, remove } from 'fs-extra';
import resizeImageAndDeleteInput from './resizeImageAndDeleteInput';
import * as sharp from 'sharp';

describe('resizeImage', () => {


	it('should resize the image to the max dimension specified', async () => {
		const fullFilePath = `${process.cwd()}/test-cases/sample.jpeg`;
		const copiedFilePath = `${process.cwd()}/test-cases/sample-copied.jpeg`;
		const resizedImageFilePath = `${process.cwd()}/test-cases/sample-copied-resized.jpeg`;
		await copy(fullFilePath, copiedFilePath);

		await resizeImageAndDeleteInput(copiedFilePath, resizedImageFilePath, 400);
		const metadata = await sharp(resizedImageFilePath).metadata();

		expect(metadata.width).toBe(400);
		expect(metadata.height).toBe(266);

		await remove(resizedImageFilePath);
	});

	it('should keep image aspect ratio', async () => {
		const fullFilePath = `${process.cwd()}/test-cases/sample.jpeg`;
		const copiedFilePath = `${process.cwd()}/test-cases/sample-copied.jpeg`;
		const resizedImageFilePath = `${process.cwd()}/test-cases/sample-copied-resized.jpeg`;
		await copy(fullFilePath, copiedFilePath);
		const originalMetadata = await sharp(copiedFilePath).metadata();

		await resizeImageAndDeleteInput(copiedFilePath, resizedImageFilePath, 400);
		const metadata = await sharp(resizedImageFilePath).metadata();

		if (originalMetadata.width === undefined || originalMetadata.height === undefined ||
			metadata.width === undefined || metadata.height === undefined) {
			expect('Image is missing metadata information').toBe(false);
			return;
		}

		expect(originalMetadata.width / originalMetadata.height).toBeCloseTo(metadata.width / metadata.height);

		await remove(resizedImageFilePath);
	});

	it('should remove original image', async () => {
		const fullFilePath = `${process.cwd()}/test-cases/sample.jpeg`;
		const copiedFilePath = `${process.cwd()}/test-cases/sample-copied.jpeg`;
		const resizedImageFilePath = `${process.cwd()}/test-cases/sample-copied-resized.jpeg`;
		await copy(fullFilePath, copiedFilePath);

		await resizeImageAndDeleteInput(copiedFilePath, resizedImageFilePath, 400);

		const doesFileExists = await exists(copiedFilePath);
		expect(doesFileExists).toBe(false);

		await remove(resizedImageFilePath);
	});

	it('should return original image if no resize is needed', async () => {
		const fullFilePath = `${process.cwd()}/test-cases/sample.jpeg`;
		const copiedFilePath = `${process.cwd()}/test-cases/sample-copied.jpeg`;
		const resizedImageFilePath = `${process.cwd()}/test-cases/sample-copied-resized.jpeg`;
		await copy(fullFilePath, copiedFilePath);
		const originalMetadata = await sharp(copiedFilePath).metadata();

		await resizeImageAndDeleteInput(copiedFilePath, resizedImageFilePath, 1000);

		const resizedImageMetadata = await sharp(resizedImageFilePath).metadata();

		expect(originalMetadata.width).toBe(resizedImageMetadata.width);
		expect(originalMetadata.height).toBe(resizedImageMetadata.height);
		expect(originalMetadata.size).toBe(resizedImageMetadata.size);

		await remove(resizedImageFilePath);
	});

});
