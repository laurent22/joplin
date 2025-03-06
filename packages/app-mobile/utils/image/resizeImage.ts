import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import fileToImage from './fileToImage.web';
import FsDriverWeb from '../fs-driver/fs-driver-rn.web';

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
	if (shim.mobilePlatform() === 'web') {
		const image = await fileToImage(options.inputPath);
		try {
			const canvas = document.createElement('canvas');

			// Choose a scale factor such that the resized image fits within a
			// maxWidth x maxHeight box.
			const scale = Math.min(
				options.maxWidth / image.image.width,
				options.maxHeight / image.image.height,
			);
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
		const resizedImage = await ImageResizer.createResizedImage(
			options.inputPath,
			options.maxWidth,
			options.maxHeight,
			options.format,
			options.quality, // quality
			undefined, // rotation
			undefined, // outputPath
			true, // keep metadata
		);

		const resizedImagePath = resizedImage.uri;
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
