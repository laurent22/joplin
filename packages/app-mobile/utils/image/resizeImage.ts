import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import ImageResizer from '@bam.tech/react-native-image-resizer';

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
};

export default resizeImage;
