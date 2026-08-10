import isFileAValidImage, { supportedImageFormat } from './isFileAValidImage';

// Map MIME types to file extensions (for filenames) and detected extensions (from file-type library)
const mimeToFileExt: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpeg',
	'image/bmp': 'bmp',
	'application/zip': 'zip',
	'application/pdf': 'pdf',
};

const mimeToDetectedExt: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/bmp': 'bmp',
	'application/zip': 'zip',
	'application/pdf': 'pdf',
};

describe('isFileAValidImage', () => {

	it.each(
		supportedImageFormat,
	)('should be valid if the format is supported: %s', async (format: string) => {
		const fileExt = mimeToFileExt[format];
		const detectedExt = mimeToDetectedExt[format];
		const fileName = `sample.${fileExt}`;
		const fullFilePath = `./test-cases/${fileName}`;
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(true);
		expect(fileFormat).toBe(detectedExt);
	});

	it.each(['application/zip', 'application/pdf'])('should not be valid if the format is not supported: %s', async (format: string) => {
		const fileExt = mimeToFileExt[format];
		const detectedExt = mimeToDetectedExt[format];
		const fileName = `sample.${fileExt}`;
		const fullFilePath = `./test-cases/${fileName}`;
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(false);
		expect(fileFormat).toBe(detectedExt);
	});

	it('should throw an error if it is not possible to determine the type of the file', async () => {
		const fullFilePath = './test-cases/sample_not_recognized';
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(false);
		expect(fileFormat).toBe('unknown');
	});
});
