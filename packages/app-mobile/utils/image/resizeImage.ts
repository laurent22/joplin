import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import fileToImage from './fileToImage.web';
import FsDriverWeb from '../fs-driver/fs-driver-rn.web';
import getImageDimensions from './getImageDimensions';

const logger = Logger.create('resizeImage');

type OutputFormat = 'PNG' | 'JPEG';

interface Options {
	inputPath: string;
	outputPath: string;
	maxWidth: number;
	maxHeight: number;
	format: OutputFormat;
	quality: number;
}

const resizeImage = async (options: Options) => {
	type Sized = { width: number; height: number };
	const computeScale = (image: Sized) => {
		// Choose a scale factor such that the resized image fits within a
		// maxWidth x maxHeight box.
		const scale = Math.min(
			options.maxWidth / image.width,
			options.maxHeight / image.height,
		);
		return scale;
	};

	if (shim.mobilePlatform() === 'web') {
		const image = await fileToImage(options.inputPath);
		try {
			const canvas = document.createElement('canvas');

			const scale = computeScale(image.image);
			canvas.width = image.image.width * scale;
			canvas.height = image.image.height * scale;

			const ctx = canvas.getContext('2d');
			ctx.drawImage(image.image, 0, 0, canvas.width, canvas.height);

			const blob = await new Promise<Blob>((resolve, reject) => {
				try {
					canvas.toBlob(
						(blob) => resolve(blob),
						`image/${options.format.toLowerCase()}`,
						options.quality,
					);
				} catch (error) {
					reject(error);
				}
			});

			await (shim.fsDriver() as FsDriverWeb).writeFile(
				options.outputPath, await blob.arrayBuffer(), 'Buffer',
			);
		} finally {
			image.free();
		}
	} else {
		const originalSize = await getImageDimensions(options.inputPath);
		logger.debug('Processing image with size', originalSize.width, 'x', originalSize.height);

		let context = ImageManipulator.manipulate(options.inputPath);

		// Only rescale the image if it's bigger than the maximum size:
		if (originalSize.width > options.maxWidth || originalSize.height > options.maxHeight) {
			const scale = computeScale(originalSize);
			context = context.resize({
				width: originalSize.width * scale,
				height: originalSize.height * scale,
			});
		}

		const final = await context.renderAsync();
		const saved = await final.saveAsync({
			format: options.format === 'PNG' ? SaveFormat.PNG : SaveFormat.JPEG,
			compress: options.quality,
		});

		const resizedImagePath = saved.uri;
		logger.info('Resized image ', resizedImagePath);
		logger.info(`Moving ${resizedImagePath} => ${options.outputPath}`);

		await shim.fsDriver().copy(resizedImagePath, options.outputPath);

		try {
			await shim.fsDriver().unlink(resizedImagePath);
		} catch (error) {
			logger.warn('Error when unlinking cached file: ', error);
		}
	}
};

export default resizeImage;
