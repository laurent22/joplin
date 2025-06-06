import isFileAValidImage, { supportedImageFormat } from './isFileAValidImage';

describe('isFileAValidImage', () => {

	it.each(
		supportedImageFormat,
	)('should be valid if the format is supported: %s', async (format: string) => {
		const fileName = `sample.${format.split('/')[1]}`;
		const fullFilePath = `./test-cases/${fileName}`;
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(true);
		expect(fileFormat).toBe(format);
	});

	it.each(['application/zip', 'application/pdf'])('should not be valid if the format is not supported: %s', async (format: string) => {
		const fileName = `sample.${format.split('/')[1]}`;
		const fullFilePath = `./test-cases/${fileName}`;
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(false);
		expect(fileFormat).toBe(format);
	});

	it('should throw an error if it is not possible to determine the type of the file', async () => {
		const fullFilePath = './test-cases/sample_not_recognized';
		const [isValid, fileFormat] = await isFileAValidImage(fullFilePath);
		expect(isValid).toBe(false);
		expect(fileFormat).toBe('unknown');
	});
});
